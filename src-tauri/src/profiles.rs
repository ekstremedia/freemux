use crate::models::ConversionProfile;
use std::fs;
use std::path::PathBuf;

pub struct ProfilesRepository {
    base_dir: PathBuf,
}

impl ProfilesRepository {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    pub fn load(&self) -> Result<Vec<ConversionProfile>, String> {
        let path = self.file_path();
        if !path.exists() {
            return Ok(Vec::new());
        }

        let content =
            fs::read_to_string(&path).map_err(|error| format!("failed to read profiles file: {error}"))?;

        serde_json::from_str::<Vec<ConversionProfile>>(&content)
            .map_err(|error| format!("failed to parse profiles file: {error}"))
    }

    pub fn save(&self, profile: ConversionProfile) -> Result<ConversionProfile, String> {
        let mut profiles = self.load()?;
        let existing_index = profiles.iter().position(|item| item.id == profile.id);

        if let Some(index) = existing_index {
            profiles[index] = profile.clone();
        } else {
            profiles.insert(0, profile.clone());
        }

        self.write_all(&profiles)?;
        Ok(profile)
    }

    pub fn delete(&self, profile_id: &str) -> Result<(), String> {
        let profiles = self
            .load()?
            .into_iter()
            .filter(|profile| profile.id != profile_id)
            .collect::<Vec<_>>();

        self.write_all(&profiles)
    }

    fn write_all(&self, profiles: &[ConversionProfile]) -> Result<(), String> {
        fs::create_dir_all(&self.base_dir)
            .map_err(|error| format!("failed to create app data directory: {error}"))?;

        let path = self.file_path();
        let content = serde_json::to_string_pretty(profiles)
            .map_err(|error| format!("failed to encode profiles file: {error}"))?;

        fs::write(path, content).map_err(|error| format!("failed to write profiles file: {error}"))
    }

    fn file_path(&self) -> PathBuf {
        self.base_dir.join("profiles.json")
    }
}
