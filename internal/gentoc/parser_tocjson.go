package gentoc

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ParseTOCContentsJSON turns the raw bytes of a guide's toc-contents.json
// into a TOC tree.
//
// IMPORTANT: AWS does not publish a stable, documented schema for
// toc-contents.json. This parser is a best-effort heuristic that accepts
// several plausible shapes (an array of nodes, or an object wrapping such
// an array under a common key name) and recognizes several plausible key
// names for a node's title, link and children. It has NOT been validated
// against a live response, because this environment's network egress to
// docs.aws.amazon.com was blocked when this was written (see README.md,
// "検証ステータス"). Before relying on this in production, capture a real
// toc-contents.json from a target guide and add it as a fixture in
// testdata/, then adjust the key-name candidates below to match.
func ParseTOCContentsJSON(raw []byte, baseURL string) ([]*TOCNode, error) {
	var v interface{}
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, fmt.Errorf("decode toc-contents.json: %w", err)
	}

	nodes, ok := walkTOCJSON(v, baseURL)
	if !ok || len(nodes) == 0 {
		return nil, fmt.Errorf("toc-contents.json: no recognizable TOC structure found")
	}
	return nodes, nil
}

var titleKeys = []string{"title", "label", "name", "text"}
var hrefKeys = []string{"href", "url", "link", "path"}
var childrenKeys = []string{"children", "items", "topics", "contents", "chapters", "sections", "nodes"}

// walkTOCJSON recursively interprets a decoded JSON value as either a list
// of TOC nodes, a single TOC node, or a wrapper object holding one of those
// under a well-known key.
func walkTOCJSON(v interface{}, baseURL string) ([]*TOCNode, bool) {
	switch val := v.(type) {
	case []interface{}:
		var nodes []*TOCNode
		for _, item := range val {
			node, ok := decodeTOCNode(item, baseURL)
			if ok {
				nodes = append(nodes, node)
			}
		}
		return nodes, len(nodes) > 0

	case map[string]interface{}:
		// Try treating the whole object as a single node first.
		if node, ok := decodeTOCNode(val, baseURL); ok {
			return []*TOCNode{node}, true
		}
		// Otherwise look for a wrapper key holding the real list.
		for _, key := range childrenKeys {
			if child, exists := lookupCaseInsensitive(val, key); exists {
				if nodes, ok := walkTOCJSON(child, baseURL); ok {
					return nodes, true
				}
			}
		}
		return nil, false

	default:
		return nil, false
	}
}

// decodeTOCNode interprets a single JSON value as one TOC node (title +
// URL + optional children). It requires at least a non-empty title.
func decodeTOCNode(v interface{}, baseURL string) (*TOCNode, bool) {
	obj, ok := v.(map[string]interface{})
	if !ok {
		return nil, false
	}

	title := firstStringValue(obj, titleKeys)
	if strings.TrimSpace(title) == "" {
		return nil, false
	}

	href := firstStringValue(obj, hrefKeys)
	resolvedURL := ""
	if href != "" {
		if u, err := joinURL(baseURL, href); err == nil {
			resolvedURL = u
		} else {
			resolvedURL = href
		}
	}

	node := &TOCNode{Title: strings.TrimSpace(title), URL: resolvedURL}

	for _, key := range childrenKeys {
		if child, exists := lookupCaseInsensitive(obj, key); exists {
			if childNodes, ok := walkTOCJSON(child, baseURL); ok {
				node.Children = childNodes
			}
		}
	}

	return node, true
}

func firstStringValue(obj map[string]interface{}, keys []string) string {
	for _, key := range keys {
		if raw, ok := lookupCaseInsensitive(obj, key); ok {
			if s, ok := raw.(string); ok {
				return s
			}
		}
	}
	return ""
}

func lookupCaseInsensitive(obj map[string]interface{}, key string) (interface{}, bool) {
	if v, ok := obj[key]; ok {
		return v, true
	}
	for k, v := range obj {
		if strings.EqualFold(k, key) {
			return v, true
		}
	}
	return nil, false
}
