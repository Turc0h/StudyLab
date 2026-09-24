use serde::{Serialize, Serializer, ser::SerializeStruct};
use std::fmt;

/// Strongly-typed domain and system errors for StudyLab.
/// Serializes to a standard JSON format { code: string, message: string, details?: any }
/// for seamless consumption by the React / TypeScript frontend over Tauri IPC.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StudyLabError {
    InvalidInput { field: String, message: String },
    ValidationFailed { rule: String, message: String },
    NotFound { entity: String, id: String },
    CycleDetected { path: Vec<String>, message: String },
    Internal { message: String },
}

impl StudyLabError {
    pub fn invalid_input(field: impl Into<String>, message: impl Into<String>) -> Self {
        Self::InvalidInput {
            field: field.into(),
            message: message.into(),
        }
    }

    pub fn validation_failed(rule: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ValidationFailed {
            rule: rule.into(),
            message: message.into(),
        }
    }

    pub fn not_found(entity: impl Into<String>, id: impl Into<String>) -> Self {
        Self::NotFound {
            entity: entity.into(),
            id: id.into(),
        }
    }

    pub fn cycle_detected(path: Vec<String>, message: impl Into<String>) -> Self {
        Self::CycleDetected {
            path,
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
        }
    }

    pub fn error_code(&self) -> &'static str {
        match self {
            Self::InvalidInput { .. } => "INVALID_INPUT",
            Self::ValidationFailed { .. } => "VALIDATION_FAILED",
            Self::NotFound { .. } => "NOT_FOUND",
            Self::CycleDetected { .. } => "CYCLE_DETECTED",
            Self::Internal { .. } => "INTERNAL_ERROR",
        }
    }
}

impl fmt::Display for StudyLabError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput { field, message } => {
                write!(f, "Invalid input for '{field}': {message}")
            }
            Self::ValidationFailed { rule, message } => {
                write!(f, "Validation failed [{rule}]: {message}")
            }
            Self::NotFound { entity, id } => {
                write!(f, "Entity '{entity}' with ID '{id}' not found")
            }
            Self::CycleDetected { path, message } => {
                write!(f, "Cycle detected along path {:?}: {message}", path)
            }
            Self::Internal { message } => {
                write!(f, "Internal error: {message}")
            }
        }
    }
}

impl std::error::Error for StudyLabError {}

impl Serialize for StudyLabError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("StudyLabError", 3)?;
        state.serialize_field("code", self.error_code())?;
        state.serialize_field("message", &self.to_string())?;

        match self {
            Self::InvalidInput { field, .. } => {
                state.serialize_field("field", field)?;
            }
            Self::ValidationFailed { rule, .. } => {
                state.serialize_field("rule", rule)?;
            }
            Self::NotFound { entity, id } => {
                state.serialize_field("entity", entity)?;
                state.serialize_field("id", id)?;
            }
            Self::CycleDetected { path, .. } => {
                state.serialize_field("path", path)?;
            }
            Self::Internal { .. } => {
                state.serialize_field("details", &None::<String>)?;
            }
        }

        state.end()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_code_mapping() {
        let err = StudyLabError::invalid_input("title", "cannot be empty");
        assert_eq!(err.error_code(), "INVALID_INPUT");
        assert!(err.to_string().contains("cannot be empty"));

        let cycle = StudyLabError::cycle_detected(vec!["A".into(), "B".into()], "loop");
        assert_eq!(cycle.error_code(), "CYCLE_DETECTED");
    }

    #[test]
    fn test_error_serialization() {
        let err = StudyLabError::invalid_input("age", "must be positive");
        let serialized = serde_json::to_string(&err).expect("serialization works");
        assert!(serialized.contains("\"code\":\"INVALID_INPUT\""));
        assert!(serialized.contains("\"field\":\"age\""));
    }
}
