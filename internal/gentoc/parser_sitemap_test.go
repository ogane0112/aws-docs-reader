package gentoc

import "testing"

func TestParseSitemapXML_FiltersAndSorts(t *testing.T) {
	raw := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://docs.aws.amazon.com/AmazonECS/latest/developerguide/setting-up.html</loc></url>
  <url><loc>https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html</loc></url>
  <url><loc>https://docs.aws.amazon.com/AmazonECS/latest/APIReference/unrelated.html</loc></url>
</urlset>`)

	nodes, err := ParseSitemapXML(raw, baseURL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(nodes) != 2 {
		t.Fatalf("got %d nodes, want 2 (unrelated guide URL should be filtered): %+v", len(nodes), nodes)
	}
	// sorted lexically: setting-up.html < Welcome.html is false ('W' < 's' in ASCII),
	// so Welcome.html should come first.
	if nodes[0].Title != "Welcome" {
		t.Errorf("nodes[0].Title = %q, want Welcome", nodes[0].Title)
	}
}

func TestParseSitemapXML_IndexIsRejected(t *testing.T) {
	raw := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://docs.aws.amazon.com/sitemap-1.xml</loc></sitemap>
</sitemapindex>`)

	if _, err := ParseSitemapXML(raw, baseURL); err == nil {
		t.Fatal("expected an error for a sitemap index, got nil")
	}
}

func TestParseSitemapXML_NoMatchingURLsErrors(t *testing.T) {
	raw := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://docs.aws.amazon.com/other-guide/page.html</loc></url>
</urlset>`)

	if _, err := ParseSitemapXML(raw, baseURL); err == nil {
		t.Fatal("expected an error when no URLs match baseURL, got nil")
	}
}
