// Package gateway provides the HTTP/WebSocket gateway functionality
package gateway

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/openclaw/openclaw-go/internal/mcp"
	"go.uber.org/zap"
)

// Config holds gateway configuration
type Config struct {
	Address     string
	Environment string
	MCPConfig   mcp.Config
}

// Server represents the gateway server
type Server struct {
	router *gin.Engine
	server *http.Server
	config *Config
	logger *zap.Logger
	mcp    *mcp.Manager
}

// LoadConfig loads configuration from environment and files
func LoadConfig() *Config {
	return &Config{
		Address:     getEnv("OPENCLAW_GATEWAY_ADDR", ":8080"),
		Environment: getEnv("OPENCLAW_ENV", "development"),
		MCPConfig:   mcp.LoadConfig(),
	}
}

// NewServer creates a new gateway server
func NewServer(config *Config, logger *zap.Logger) *Server {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(loggingMiddleware(logger))

	server := &Server{
		router: router,
		config: config,
		logger: logger,
		mcp:    mcp.NewManager(config.MCPConfig, logger),
	}

	server.setupRoutes()

	return server
}

// Start starts the server
func (s *Server) Start() error {
	s.server = &http.Server{
		Addr:    s.config.Address,
		Handler: s.router,
	}

	s.logger.Info("Starting gateway server",
		zap.String("address", s.config.Address),
	)

	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func (s *Server) setupRoutes() {
	// Health check
	s.router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes
	api := s.router.Group("/api")
	{
		api.GET("/mcp/servers", s.handleMCPListServers)
		api.POST("/mcp/servers/:id/connect", s.handleMCPConnect)
		api.POST("/mcp/servers/:id/call", s.handleMCPCallTool)
	}

	// WebSocket endpoint
	s.router.GET("/ws", s.handleWebSocket)
}

func loggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		logger.Info("HTTP request",
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("duration", time.Since(start)),
		)
	}
}

func getEnv(key, defaultValue string) string {
	if value := "os".Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
