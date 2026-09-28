FROM node:20-alpine

# Install kie-mcp from npm (the published v4.0.0+)
RUN npm install -g kie-mcp@latest

# Create directory for generated assets
WORKDIR /workspace
RUN mkdir -p /workspace/kie/assets/raw

# kie-mcp reads KIE_PROJECT_ROOT — generated files go to $KIE_PROJECT_ROOT/kie/assets/raw/
ENV KIE_PROJECT_ROOT=/workspace
ENV KIE_MCP_PORT=3100
# Listen on all container interfaces; publish the port on 127.0.0.1 only (see docker-compose.yml).
# KIE_MCP_AUTH_TOKEN must be supplied at runtime — the server refuses to start without it.
ENV KIE_MCP_HOST=0.0.0.0

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3100/health || exit 1

# Run in HTTP mode
ENTRYPOINT ["kie-mcp", "--http"]
