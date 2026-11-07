FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /workspace
RUN addgroup -S -g 10001 sandbox && adduser -S -D -H -u 10001 -G sandbox sandbox
COPY --chown=10001:10001 runner.mjs contract.mjs /workspace/
USER 10001:10001
ENTRYPOINT ["node", "--permission", "--allow-fs-read=/workspace", "--allow-fs-write=/tmp", "--disable-proto=throw", "/workspace/runner.mjs"]
