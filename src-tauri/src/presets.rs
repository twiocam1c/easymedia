//! 预设的纯列表操作(upsert / 删除),与文件 IO 分离以便单元测试。

use crate::models::SavedPreset;

/// 插入或更新预设:同 id 则替换,否则追加。返回新列表(不可变风格)。
pub fn upsert_preset(presets: &[SavedPreset], preset: SavedPreset) -> Vec<SavedPreset> {
    let mut out: Vec<SavedPreset> = Vec::with_capacity(presets.len() + 1);
    let mut replaced = false;
    for p in presets {
        if p.id == preset.id {
            out.push(preset.clone());
            replaced = true;
        } else {
            out.push(p.clone());
        }
    }
    if !replaced {
        out.push(preset);
    }
    out
}

/// 按 id 删除预设,返回新列表。
pub fn remove_preset(presets: &[SavedPreset], id: &str) -> Vec<SavedPreset> {
    presets
        .iter()
        .filter(|p| p.id != id)
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{
        AdvancedOverrides, CompressSpec, QualityPreset, ResolutionPreset, TaskSpec,
    };

    fn preset(id: &str, name: &str) -> SavedPreset {
        SavedPreset {
            id: id.to_string(),
            name: name.to_string(),
            spec: TaskSpec::Compress(CompressSpec {
                quality: QualityPreset::Balanced,
                target_size_mb: None,
                resolution: ResolutionPreset::Original,
                advanced: AdvancedOverrides::default(),
            }),
        }
    }

    #[test]
    fn upsert_appends_new() {
        let list = vec![preset("a", "A")];
        let out = upsert_preset(&list, preset("b", "B"));
        assert_eq!(out.len(), 2);
        assert_eq!(out[1].id, "b");
    }

    #[test]
    fn upsert_replaces_existing_id() {
        let list = vec![preset("a", "A"), preset("b", "B")];
        let out = upsert_preset(&list, preset("a", "A-renamed"));
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].name, "A-renamed");
        // 位置保持不变
        assert_eq!(out[0].id, "a");
        assert_eq!(out[1].id, "b");
    }

    #[test]
    fn remove_by_id() {
        let list = vec![preset("a", "A"), preset("b", "B")];
        let out = remove_preset(&list, "a");
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].id, "b");
    }

    #[test]
    fn remove_missing_id_is_noop() {
        let list = vec![preset("a", "A")];
        let out = remove_preset(&list, "zzz");
        assert_eq!(out.len(), 1);
    }
}
