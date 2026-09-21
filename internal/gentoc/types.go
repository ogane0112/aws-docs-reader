package gentoc

import "time"

// GuideConfig is one entry of guides.config.yaml (input).
type GuideConfig struct {
	ID       string `yaml:"id"`
	Service  string `yaml:"service"`
	Title    string `yaml:"title"`
	BaseURL  string `yaml:"baseUrl"`
	Priority int    `yaml:"priority"`
}

// Config is the root of guides.config.yaml.
type Config struct {
	Guides []GuideConfig `yaml:"guides"`
}

// GuideMeta is one entry of public/data/guides.json.
type GuideMeta struct {
	ID          string    `json:"id"`
	Service     string    `json:"service"`
	Title       string    `json:"title"`
	BaseURL     string    `json:"baseUrl"`
	Priority    int       `json:"priority"`
	PageCount   int       `json:"pageCount"`
	GeneratedAt time.Time `json:"generatedAt"`
}

// TOCNode is one node of public/data/toc/{guideId}.json.
type TOCNode struct {
	Title    string     `json:"title"`
	URL      string     `json:"url"`
	Children []*TOCNode `json:"children"`
}

// TOCDocument is the root of public/data/toc/{guideId}.json.
type TOCDocument struct {
	GuideID string     `json:"guideId"`
	Nodes   []*TOCNode `json:"nodes"`
}

// Source identifies which strategy produced a TOC.
type Source string

const (
	SourceTOCJSON Source = "toc-contents.json"
	SourceSitemap Source = "sitemap.xml"
)

// countPages counts every node in the tree, including nested children.
func countPages(nodes []*TOCNode) int {
	n := 0
	for _, node := range nodes {
		n++
		n += countPages(node.Children)
	}
	return n
}
