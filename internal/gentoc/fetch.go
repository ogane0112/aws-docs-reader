package gentoc

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Fetcher retrieves raw bytes for a URL. It exists so tests can substitute
// a fake implementation instead of hitting the network.
type Fetcher interface {
	Get(rawURL string) ([]byte, int, error)
}

// HTTPFetcher is the production Fetcher backed by net/http.
type HTTPFetcher struct {
	Client    *http.Client
	UserAgent string
}

// NewHTTPFetcher returns an HTTPFetcher with a sane timeout.
func NewHTTPFetcher(timeout time.Duration) *HTTPFetcher {
	return &HTTPFetcher{
		Client:    &http.Client{Timeout: timeout},
		UserAgent: "aws-docs-reader-gentoc/1.0 (+https://github.com/ogane0112/aws-docs-reader)",
	}
}

// Get performs a GET request and returns the body, the HTTP status code,
// and an error only for transport-level failures (a non-200 status is
// returned as a normal result, not an error, so callers can fall back).
func (f *HTTPFetcher) Get(rawURL string) ([]byte, int, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, 0, fmt.Errorf("build request for %s: %w", rawURL, err)
	}
	req.Header.Set("User-Agent", f.UserAgent)

	resp, err := f.Client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("GET %s: %w", rawURL, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20)) // 32MiB safety cap
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("read body of %s: %w", rawURL, err)
	}

	return body, resp.StatusCode, nil
}

// joinURL appends a relative path to a base URL that is expected to end
// with a trailing slash (as guides.config.yaml's baseUrl does).
func joinURL(base, rel string) (string, error) {
	u, err := url.Parse(base)
	if err != nil {
		return "", fmt.Errorf("parse base URL %s: %w", base, err)
	}
	if !strings.HasSuffix(u.Path, "/") {
		u.Path += "/"
	}
	ref, err := url.Parse(rel)
	if err != nil {
		return "", fmt.Errorf("parse relative URL %s: %w", rel, err)
	}
	return u.ResolveReference(ref).String(), nil
}
