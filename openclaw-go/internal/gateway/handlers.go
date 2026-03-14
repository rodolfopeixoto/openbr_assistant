package gateway

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// WebSocket handler
func (s *Server) handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		s.logger.Error("WebSocket upgrade failed", err)
		return
	}
	defer conn.Close()

	s.logger.Info("WebSocket connection established")

	// Handle WebSocket connection
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			s.logger.Error("WebSocket read error", err)
			return
		}

		// Echo message back for now
		if err := conn.WriteMessage(messageType, message); err != nil {
			s.logger.Error("WebSocket write error", err)
			return
		}
	}
}

// MCP Handlers
func (s *Server) handleMCPListServers(c *gin.Context) {
	servers := s.mcp.ListServers()
	c.JSON(http.StatusOK, gin.H{"servers": servers})
}

func (s *Server) handleMCPConnect(c *gin.Context) {
	serverID := c.Param("id")
	
	if err := s.mcp.Connect(serverID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "connected",
		"server_id": serverID,
		"timestamp": time.Now().Unix(),
	})
}

func (s *Server) handleMCPDisconnect(c *gin.Context) {
	serverID := c.Param("id")
	s.mcp.Disconnect(serverID)
	
	c.JSON(http.StatusOK, gin.H{
		"status": "disconnected",
		"server_id": serverID,
	})
}

func (s *Server) handleMCPCallTool(c *gin.Context) {
	serverID := c.Param("id")
	
	var req struct {
		Tool string                 `json:"tool"`
		Args map[string]interface{} `json:"args"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := s.mcp.CallTool(serverID, req.Tool, req.Args)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (s *Server) handleMCPListTools(c *gin.Context) {
	serverID := c.Param("id")
	tools, err := s.mcp.ListTools(serverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tools": tools})
}

func (s *Server) handleMCPListResources(c *gin.Context) {
	serverID := c.Param("id")
	resources, err := s.mcp.ListResources(serverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"resources": resources})
}

// Container Handlers (placeholders - would connect to actual container service)
func (s *Server) handleListContainers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"containers": []interface{}{},
		"count": 0,
	})
}

func (s *Server) handleGetRuntimeInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"runtime": "docker",
		"version": "24.0.0",
		"available": true,
	})
}

func (s *Server) handleGetContainerLogs(c *gin.Context) {
	containerID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"container_id": containerID,
		"logs": "Container logs would appear here...",
	})
}

func (s *Server) handleStopContainer(c *gin.Context) {
	containerID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"container_id": containerID,
		"message": "Container stopped",
	})
}

func (s *Server) handleRemoveContainer(c *gin.Context) {
	containerID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"container_id": containerID,
		"message": "Container removed",
	})
}

// Intelligence Handlers (placeholders - would connect to intelligence service)
func (s *Server) handleListArticles(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"articles": []interface{}{},
		"count": 0,
	})
}

func (s *Server) handleGetArticle(c *gin.Context) {
	articleID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"id": articleID,
		"title": "Article Title",
		"content": "Article content...",
	})
}

func (s *Server) handleSaveArticle(c *gin.Context) {
	articleID := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"article_id": articleID,
		"saved": true,
	})
}

func (s *Server) handleListDigests(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"digests": []interface{}{},
		"count": 0,
	})
}

func (s *Server) handleGenerateDigest(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"digest_id": "digest-123",
		"status": "generating",
	})
}

func (s *Server) handleGetTrends(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"trends": []interface{}{},
		"count": 0,
	})
}
