package main

import (
	"context"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"sft/internal/config"
	"sft/internal/httpx"

	"github.com/joho/godotenv"
)

func main() {
	// Load optional .env files. Default env = dev unless APP_ENV/GO_ENV/ENV is set.
	envName := strings.ToLower(strings.TrimSpace(firstNonEmpty(
		os.Getenv("APP_ENV"),
		os.Getenv("GO_ENV"),
		os.Getenv("ENV"),
	)))
	switch envName {
	case "", "dev", "development":
		envName = "dev"
	case "prod", "production":
		envName = "prod"
	}
	for _, f := range []string{".env", ".env." + envName} {
		_ = godotenv.Overload(f)
	}

	cfg := config.Load()

	// Ensure correct MIME type for .mjs modules.
	_ = mime.AddExtensionType(".mjs", "text/javascript")
	_ = mime.AddExtensionType(".woff2", "font/woff2")
	_ = mime.AddExtensionType(".woff", "font/woff")

	handler, err := httpx.NewRouter(cfg)
	if err != nil {
		log.Fatalf("router init failed: %v", err)
	}

	addr := cfg.Port
	logger := log.New(os.Stdout, "", log.LstdFlags)
	logger.Printf("Server starting on http://localhost%s", addr)

	server := &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	// graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Printf("server shutdown error: %v", err)
	} else {
		logger.Printf("server stopped gracefully")
	}
}

// firstNonEmpty returns the first non-empty string from the provided values.
func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
