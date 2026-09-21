package gentoc

import "testing"

const baseURL = "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/"

func TestParseTOCContentsJSON_FlatArrayShape(t *testing.T) {
	raw := []byte(`[
		{"title": "Amazon ECSとは", "href": "Welcome.html", "children": []},
		{"title": "セットアップ", "href": "setting-up.html", "children": [
			{"title": "IAM", "href": "setting-up-iam.html"}
		]}
	]`)

	nodes, err := ParseTOCContentsJSON(raw, baseURL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(nodes) != 2 {
		t.Fatalf("got %d top-level nodes, want 2", len(nodes))
	}
	if nodes[0].URL != baseURL+"Welcome.html" {
		t.Errorf("node 0 URL = %q", nodes[0].URL)
	}
	if len(nodes[1].Children) != 1 || nodes[1].Children[0].Title != "IAM" {
		t.Errorf("node 1 children = %+v", nodes[1].Children)
	}
}

func TestParseTOCContentsJSON_WrappedObjectDifferentKeys(t *testing.T) {
	raw := []byte(`{
		"contents": [
			{"label": "Getting started", "link": "getting-started.html", "topics": [
				{"label": "Step 1", "link": "step-1.html"}
			]}
		]
	}`)

	nodes, err := ParseTOCContentsJSON(raw, baseURL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(nodes) != 1 || nodes[0].Title != "Getting started" {
		t.Fatalf("nodes = %+v", nodes)
	}
	if len(nodes[0].Children) != 1 || nodes[0].Children[0].Title != "Step 1" {
		t.Fatalf("children = %+v", nodes[0].Children)
	}
}

func TestParseTOCContentsJSON_UnrecognizableShapeErrors(t *testing.T) {
	raw := []byte(`{"unrelated": "structure", "count": 42}`)
	if _, err := ParseTOCContentsJSON(raw, baseURL); err == nil {
		t.Fatal("expected an error for an unrecognizable shape, got nil")
	}
}
