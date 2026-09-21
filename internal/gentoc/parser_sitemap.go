package gentoc

import (
	"encoding/xml"
	"fmt"
	"path"
	"sort"
	"strings"
)

// sitemapURLSet mirrors the standard sitemaps.org schema:
// https://www.sitemaps.org/protocol.html
type sitemapURLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	URLs    []sitemapURL `xml:"url"`
	Index   []sitemapIdx `xml:"sitemap"` // present when this is a sitemap index instead
}

type sitemapURL struct {
	Loc string `xml:"loc"`
}

type sitemapIdx struct {
	Loc string `xml:"loc"`
}

// ParseSitemapXML turns the raw bytes of a guide's sitemap.xml into a flat
// TOC list (sitemaps carry no hierarchy or human-readable titles, so a
// title is derived from the last path segment of each URL).
//
// Only URLs that fall under baseURL are kept, so a guide-wide or
// site-wide sitemap doesn't pull in unrelated pages. If the document is a
// sitemap index (a list of other sitemaps) rather than a URL list, an
// error is returned — the caller is expected to fetch the sub-sitemap(s)
// itself, since guides.config.yaml points at one guide's own sitemap.
func ParseSitemapXML(raw []byte, baseURL string) ([]*TOCNode, error) {
	var set sitemapURLSet
	if err := xml.Unmarshal(raw, &set); err != nil {
		return nil, fmt.Errorf("decode sitemap.xml: %w", err)
	}

	if len(set.URLs) == 0 && len(set.Index) > 0 {
		return nil, fmt.Errorf("sitemap.xml is a sitemap index (%d sub-sitemaps); expected a URL list", len(set.Index))
	}

	var locs []string
	for _, u := range set.URLs {
		loc := strings.TrimSpace(u.Loc)
		if loc == "" {
			continue
		}
		if !strings.HasPrefix(loc, baseURL) {
			continue
		}
		locs = append(locs, loc)
	}

	if len(locs) == 0 {
		return nil, fmt.Errorf("sitemap.xml: no URLs under base URL %s", baseURL)
	}

	// Sitemaps make no ordering guarantee. Sorting lexically at least gives
	// deterministic, diffable output; it will NOT match the guide's real
	// reading order (see README.md, "検証ステータス").
	sort.Strings(locs)

	nodes := make([]*TOCNode, 0, len(locs))
	for _, loc := range locs {
		nodes = append(nodes, &TOCNode{
			Title: titleFromURL(loc),
			URL:   loc,
		})
	}
	return nodes, nil
}

// titleFromURL derives a human-readable placeholder title from a page's
// last path segment, e.g. ".../Welcome.html" -> "Welcome".
func titleFromURL(rawURL string) string {
	base := path.Base(rawURL)
	base = strings.TrimSuffix(base, path.Ext(base))
	base = strings.ReplaceAll(base, "-", " ")
	base = strings.ReplaceAll(base, "_", " ")
	if base == "" || base == "." || base == "/" {
		return rawURL
	}
	return base
}
