// Package middleware provides HTTP middleware components.
package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"path/filepath"
	"strings"
)

// Gzip wraps an http.Handler with gzip compression for text-based responses.
// It skips compression for already compressed formats and HEAD requests.
func Gzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !shouldCompress(r) {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")

		gzw := gzip.NewWriter(w)
		defer gzw.Close()

		wrapped := &gzipResponseWriter{
			ResponseWriter: w,
			writer:         gzw,
		}
		next.ServeHTTP(wrapped, r)
	})
}

// gzipResponseWriter proxies writes through the gzip writer while preserving headers.
type gzipResponseWriter struct {
	http.ResponseWriter
	writer io.Writer
}

func (w *gzipResponseWriter) Write(p []byte) (int, error) {
	return w.writer.Write(p)
}

// shouldCompress determines if the request should receive a gzipped response.
func shouldCompress(r *http.Request) bool {
	if r.Method == http.MethodHead {
		return false
	}
	if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		return false
	}
	return isCompressiblePath(r.URL.Path)
}

// isCompressiblePath returns true for text-like payloads where gzip provides real savings.
func isCompressiblePath(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))

	switch ext {
	// Compressible text formats
	case ".html", ".htm", ".css", ".js", ".mjs", ".json", ".map", ".svg", ".txt":
		return true
	// Already compressed or binary formats
	case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2":
		return false
	default:
		// Root paths or routes without extension are likely HTML
		return ext == ""
	}
}
