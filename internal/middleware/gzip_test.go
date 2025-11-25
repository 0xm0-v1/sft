package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGzip_CompressesHTML(t *testing.T) {
	handler := Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte("<html><body>Hello World</body></html>"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Header().Get("Content-Encoding") != "gzip" {
		t.Error("expected gzip Content-Encoding header")
	}

	gr, err := gzip.NewReader(rec.Body)
	if err != nil {
		t.Fatalf("failed to create gzip reader: %v", err)
	}
	defer gr.Close()

	body, _ := io.ReadAll(gr)
	if !strings.Contains(string(body), "Hello World") {
		t.Errorf("unexpected body: %s", body)
	}
}

func TestGzip_SkipsForImages(t *testing.T) {
	handler := Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("fake image data"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/image.png", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Header().Get("Content-Encoding") == "gzip" {
		t.Error("should not compress PNG files")
	}
}

func TestGzip_SkipsWithoutAcceptHeader(t *testing.T) {
	handler := Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("uncompressed"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	// No Accept-Encoding header

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Header().Get("Content-Encoding") == "gzip" {
		t.Error("should not compress without Accept-Encoding")
	}
	if rec.Body.String() != "uncompressed" {
		t.Errorf("unexpected body: %s", rec.Body.String())
	}
}

func TestGzip_SkipsHEADRequests(t *testing.T) {
	handler := Gzip(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodHead, "/", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Header().Get("Content-Encoding") == "gzip" {
		t.Error("should not compress HEAD requests")
	}
}

func TestIsCompressiblePath(t *testing.T) {
	tests := []struct {
		path     string
		expected bool
	}{
		{"/", true},
		{"/index.html", true},
		{"/style.css", true},
		{"/app.js", true},
		{"/app.mjs", true},
		{"/data.json", true},
		{"/icon.svg", true},
		{"/image.png", false},
		{"/photo.jpg", false},
		{"/photo.jpeg", false},
		{"/image.webp", false},
		{"/anim.gif", false},
		{"/favicon.ico", false},
		{"/font.woff", false},
		{"/font.woff2", false},
		{"/api/users", true}, // No extension = likely HTML/JSON
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got := isCompressiblePath(tt.path)
			if got != tt.expected {
				t.Errorf("isCompressiblePath(%q) = %v, want %v", tt.path, got, tt.expected)
			}
		})
	}
}
