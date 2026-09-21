package gentoc

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// LoadConfig reads and validates guides.config.yaml.
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config %s: %w", path, err)
	}

	if len(cfg.Guides) == 0 {
		return nil, fmt.Errorf("config %s: no guides defined", path)
	}

	seen := make(map[string]bool, len(cfg.Guides))
	for _, g := range cfg.Guides {
		if g.ID == "" {
			return nil, fmt.Errorf("config %s: guide with empty id", path)
		}
		if seen[g.ID] {
			return nil, fmt.Errorf("config %s: duplicate guide id %q", path, g.ID)
		}
		seen[g.ID] = true
		if g.BaseURL == "" {
			return nil, fmt.Errorf("config %s: guide %q has no baseUrl", path, g.ID)
		}
	}

	return &cfg, nil
}
