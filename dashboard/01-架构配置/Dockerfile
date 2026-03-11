FROM ghcr.io/openclaw/openclaw:latest

USER root

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl jq && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/node/.openclaw/credentials \
             /home/node/.openclaw/skills \
             /home/node/.openclaw/agents \
             /home/node/.openclaw/workspace \
             /home/node/.openclaw/cron \
             /home/node/.openclaw/logs && \
    chown -R node:node /home/node/.openclaw

COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY scripts/poll-tasks.sh /usr/local/bin/poll-tasks.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/poll-tasks.sh

USER node

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
