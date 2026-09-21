package gentoc

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"
)

// GuideResult is the outcome of processing one guide.
type GuideResult struct {
	Guide  GuideConfig
	Nodes  []*TOCNode
	Source Source
	Err    error
}

// FetchGuideTOC tries toc-contents.json first and falls back to
// sitemap.xml, per requirements section 6.
func FetchGuideTOC(f Fetcher, guide GuideConfig) GuideResult {
	tocURL, err := joinURL(guide.BaseURL, "toc-contents.json")
	if err == nil {
		if body, status, err := f.Get(tocURL); err == nil && status == 200 {
			if nodes, err := ParseTOCContentsJSON(body, guide.BaseURL); err == nil {
				return GuideResult{Guide: guide, Nodes: nodes, Source: SourceTOCJSON}
			} else {
				log.Printf("[%s] toc-contents.json fetched but unparseable, falling back to sitemap.xml: %v", guide.ID, err)
			}
		} else if err != nil {
			log.Printf("[%s] toc-contents.json fetch failed, falling back to sitemap.xml: %v", guide.ID, err)
		} else {
			log.Printf("[%s] toc-contents.json returned HTTP %d, falling back to sitemap.xml", guide.ID, status)
		}
	}

	sitemapURL, err := joinURL(guide.BaseURL, "sitemap.xml")
	if err != nil {
		return GuideResult{Guide: guide, Err: fmt.Errorf("build sitemap.xml URL: %w", err)}
	}
	body, status, err := f.Get(sitemapURL)
	if err != nil {
		return GuideResult{Guide: guide, Err: fmt.Errorf("fetch sitemap.xml: %w", err)}
	}
	if status != 200 {
		return GuideResult{Guide: guide, Err: fmt.Errorf("sitemap.xml returned HTTP %d", status)}
	}
	nodes, err := ParseSitemapXML(body, guide.BaseURL)
	if err != nil {
		return GuideResult{Guide: guide, Err: fmt.Errorf("parse sitemap.xml: %w", err)}
	}
	return GuideResult{Guide: guide, Nodes: nodes, Source: SourceSitemap}
}

// Generate runs the full pipeline: fetch each guide's TOC, then write
// public/data/guides.json and public/data/toc/{guideId}.json under outDir.
// It returns the per-guide results (including failures) so the caller can
// decide whether to fail the run.
func Generate(f Fetcher, cfg *Config, outDir string, now time.Time) ([]GuideResult, error) {
	guides := append([]GuideConfig(nil), cfg.Guides...)
	sort.Slice(guides, func(i, j int) bool { return guides[i].Priority < guides[j].Priority })

	tocDir := filepath.Join(outDir, "toc")
	if err := os.MkdirAll(tocDir, 0o755); err != nil {
		return nil, fmt.Errorf("create %s: %w", tocDir, err)
	}

	previous := loadPreviousGuideMetas(filepath.Join(outDir, "guides.json"))

	var results []GuideResult
	var metas []GuideMeta

	for _, guide := range guides {
		result := FetchGuideTOC(f, guide)
		results = append(results, result)

		if result.Err != nil {
			log.Printf("[%s] fetch failed: %v", guide.ID, result.Err)
			if prev, ok := previous[guide.ID]; ok {
				log.Printf("[%s] keeping previous guides.json entry (generated %s)", guide.ID, prev.GeneratedAt)
				metas = append(metas, prev)
			} else {
				log.Printf("[%s] skipped: no previous data to fall back to", guide.ID)
			}
			continue
		}

		doc := TOCDocument{GuideID: guide.ID, Nodes: result.Nodes}
		docPath := filepath.Join(tocDir, guide.ID+".json")
		if err := writeJSON(docPath, doc); err != nil {
			return nil, fmt.Errorf("write %s: %w", docPath, err)
		}

		metas = append(metas, GuideMeta{
			ID:          guide.ID,
			Service:     guide.Service,
			Title:       guide.Title,
			BaseURL:     guide.BaseURL,
			Priority:    guide.Priority,
			PageCount:   countPages(result.Nodes),
			GeneratedAt: now.UTC(),
		})

		log.Printf("[%s] %d pages via %s", guide.ID, countPages(result.Nodes), result.Source)
	}

	guidesPath := filepath.Join(outDir, "guides.json")
	if err := writeJSON(guidesPath, metas); err != nil {
		return nil, fmt.Errorf("write %s: %w", guidesPath, err)
	}

	return results, nil
}

// loadPreviousGuideMetas reads an existing guides.json (if any) so a guide
// whose fetch fails this run can keep its last-known metadata instead of
// vanishing from the guide list entirely.
func loadPreviousGuideMetas(path string) map[string]GuideMeta {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var metas []GuideMeta
	if err := json.Unmarshal(data, &metas); err != nil {
		log.Printf("could not parse existing %s, ignoring: %v", path, err)
		return nil
	}
	byID := make(map[string]GuideMeta, len(metas))
	for _, m := range metas {
		byID[m.ID] = m
	}
	return byID
}

func writeJSON(path string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	data = append(data, '\n')
	return os.WriteFile(path, data, 0o644)
}
