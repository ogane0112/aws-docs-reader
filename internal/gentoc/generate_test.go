package gentoc

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// fakeFetcher lets tests control exactly what each URL returns.
type fakeFetcher struct {
	responses map[string]fakeResponse
}

type fakeResponse struct {
	body   []byte
	status int
	err    error
}

func (f *fakeFetcher) Get(rawURL string) ([]byte, int, error) {
	r, ok := f.responses[rawURL]
	if !ok {
		return nil, 404, nil
	}
	return r.body, r.status, r.err
}

func TestFetchGuideTOC_FallsBackToSitemapWhenTOCJSONMissing(t *testing.T) {
	guide := GuideConfig{ID: "ecs-dev", BaseURL: baseURL, Priority: 1}
	f := &fakeFetcher{responses: map[string]fakeResponse{
		baseURL + "sitemap.xml": {
			status: 200,
			body: []byte(`<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>` + baseURL + `Welcome.html</loc></url>
</urlset>`),
		},
	}}

	result := FetchGuideTOC(f, guide)
	if result.Err != nil {
		t.Fatalf("unexpected error: %v", result.Err)
	}
	if result.Source != SourceSitemap {
		t.Errorf("source = %q, want sitemap.xml", result.Source)
	}
	if len(result.Nodes) != 1 {
		t.Fatalf("nodes = %+v", result.Nodes)
	}
}

func TestFetchGuideTOC_PrefersTOCJSONWhenAvailable(t *testing.T) {
	guide := GuideConfig{ID: "ecs-dev", BaseURL: baseURL, Priority: 1}
	f := &fakeFetcher{responses: map[string]fakeResponse{
		baseURL + "toc-contents.json": {
			status: 200,
			body:   []byte(`[{"title": "Welcome", "href": "Welcome.html"}]`),
		},
	}}

	result := FetchGuideTOC(f, guide)
	if result.Err != nil {
		t.Fatalf("unexpected error: %v", result.Err)
	}
	if result.Source != SourceTOCJSON {
		t.Errorf("source = %q, want toc-contents.json", result.Source)
	}
}

func TestGenerate_KeepsPreviousMetaOnFetchFailure(t *testing.T) {
	dir := t.TempDir()

	// Seed an existing guides.json as if a previous run had succeeded.
	previous := []GuideMeta{{
		ID: "ecs-dev", Service: "Amazon ECS", Title: "開発者ガイド",
		BaseURL: baseURL, Priority: 1, PageCount: 5,
		GeneratedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}
	seedData, _ := json.Marshal(previous)
	if err := os.WriteFile(filepath.Join(dir, "guides.json"), seedData, 0o644); err != nil {
		t.Fatal(err)
	}

	cfg := &Config{Guides: []GuideConfig{{ID: "ecs-dev", BaseURL: baseURL, Priority: 1}}}
	f := &fakeFetcher{responses: map[string]fakeResponse{}} // everything 404s

	results, err := Generate(f, cfg, dir, time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if results[0].Err == nil {
		t.Fatal("expected fetch to fail")
	}

	got, err := os.ReadFile(filepath.Join(dir, "guides.json"))
	if err != nil {
		t.Fatal(err)
	}
	var metas []GuideMeta
	if err := json.Unmarshal(got, &metas); err != nil {
		t.Fatal(err)
	}
	if len(metas) != 1 || metas[0].PageCount != 5 {
		t.Fatalf("expected previous metadata to be retained, got %+v", metas)
	}
}
