package gateway

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

func (s *Server) handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		s.logger.Error("WebSocket upgrade failed", err)
		return
	}
	defer conn.Close()

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

	c.JSON(http.StatusOK, gin.H{"status": "connected"})
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
