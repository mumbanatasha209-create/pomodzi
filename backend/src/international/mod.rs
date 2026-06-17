//! Supported countries, currencies, and validation helpers.

use crate::error::AppError;

pub mod currencies;

pub const SUPPORTED_COUNTRY_CODES: &[&str] = &[
    "ZM", "KE", "ZA", "NG", "BW", "GH", "TZ", "UG", "RW", "MW", "GB", "US", "DE", "FR", "GLOBAL",
];

pub fn default_currency_for_country(country: &str) -> &'static str {
    match country.to_uppercase().as_str() {
        "ZM" => "ZMW",
        "KE" => "KES",
        "ZA" => "ZAR",
        "NG" => "NGN",
        "BW" => "BWP",
        "GH" => "GHS",
        "TZ" => "TZS",
        "UG" => "UGX",
        "RW" => "RWF",
        "MW" => "MWK",
        "GB" => "GBP",
        "US" => "USD",
        "DE" | "FR" => "EUR",
        _ => "XLM",
    }
}

pub fn default_timezone_for_country(country: &str) -> &'static str {
    match country.to_uppercase().as_str() {
        "ZM" => "Africa/Lusaka",
        "KE" => "Africa/Nairobi",
        "ZA" => "Africa/Johannesburg",
        "NG" => "Africa/Lagos",
        "BW" => "Africa/Gaborone",
        "GH" => "Africa/Accra",
        "TZ" => "Africa/Dar_es_Salaam",
        "UG" => "Africa/Kampala",
        "RW" => "Africa/Kigali",
        "MW" => "Africa/Blantyre",
        "GB" => "Europe/London",
        "US" => "America/New_York",
        "DE" => "Europe/Berlin",
        "FR" => "Europe/Paris",
        _ => "UTC",
    }
}

pub fn validate_country(code: &str) -> Result<String, AppError> {
    let upper = code.trim().to_uppercase();
    if upper.is_empty() {
        return Err(AppError::BadRequest("Country is required".into()));
    }
    if !SUPPORTED_COUNTRY_CODES.contains(&upper.as_str()) {
        return Err(AppError::BadRequest("Unsupported country code".into()));
    }
    Ok(upper)
}

pub fn validate_email(email: &str) -> Result<(), AppError> {
    let email = email.trim();
    if email.is_empty() || !email.contains('@') || email.len() < 5 {
        return Err(AppError::BadRequest("Invalid email address".into()));
    }
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 || parts[0].is_empty() || !parts[1].contains('.') {
        return Err(AppError::BadRequest("Invalid email address".into()));
    }
    Ok(())
}

pub fn validate_password(password: &str, confirm: Option<&str>) -> Result<(), AppError> {
    if password.len() < 8 {
        return Err(AppError::BadRequest(
            "Password must be at least 8 characters".into(),
        ));
    }
    let has_letter = password.chars().any(|c| c.is_ascii_alphabetic());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    if !has_letter || !has_digit {
        return Err(AppError::BadRequest(
            "Password must include at least one letter and one number".into(),
        ));
    }
    if let Some(c) = confirm {
        if password != c {
            return Err(AppError::BadRequest("Passwords do not match".into()));
        }
    }
    Ok(())
}

/// E.164 international phone validation.
pub fn validate_phone(phone: &str, country_code: Option<&str>) -> Result<String, AppError> {
    let cleaned: String = phone.chars().filter(|c| !c.is_whitespace()).collect();
    if cleaned.is_empty() {
        return Err(AppError::BadRequest("Phone number is required".into()));
    }
    if !cleaned.starts_with('+') {
        return Err(AppError::BadRequest(
            "Phone must use international format starting with + and country code".into(),
        ));
    }
    let digits: String = cleaned.chars().skip(1).filter(|c| c.is_ascii_digit()).collect();
    if digits.len() < 8 || digits.len() > 15 {
        return Err(AppError::BadRequest("Invalid international phone number".into()));
    }
    if let Some(cc) = country_code {
        let _ = validate_country(cc)?;
    }
    Ok(format!("+{digits}"))
}

pub fn validate_currency(code: &str) -> Result<String, AppError> {
    let upper = code.trim().to_uppercase();
    if currencies::SUPPORTED_CURRENCIES.contains(&upper.as_str()) {
        Ok(upper)
    } else {
        Err(AppError::BadRequest("Unsupported currency".into()))
    }
}

pub fn validate_settlement_asset(asset: &str) -> Result<String, AppError> {
    let upper = asset.trim().to_uppercase();
    match upper.as_str() {
        "XLM" | "USDC" | "LOCAL" => Ok(if upper == "LOCAL" {
            "local_currency_equivalent".into()
        } else {
            upper
        }),
        _ => Err(AppError::BadRequest(
            "Settlement asset must be XLM, USDC, or local_currency_equivalent".into(),
        )),
    }
}
