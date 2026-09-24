//! Domain logic for Free Spaced Repetition Scheduler (FSRS v4.5)
//!
//! Provides mathematically pure implementations for:
//! - FSRS memory model (Retrievability, Difficulty, Stability, Intervals)
//! - Leech detection and specialized R calculation
//! - Load balancing (postpone, advance, peak flattening, easy days, sibling dispersion)
//! - Property tests for canonical mathematical invariants

pub mod model;
pub mod leech;
pub mod load_balancer;
pub mod property_tests;
#[cfg(test)]
pub mod fixtures_tests;

pub use model::*;
pub use leech::*;
pub use load_balancer::*;
