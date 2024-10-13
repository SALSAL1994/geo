# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.11.0

FROM node:${NODE_VERSION}-alpine

# Copy files as a non-root user. The `node` user is built in the Node image.
WORKDIR /usr/src/app
RUN chown node:node ./
USER node

# Use production node environment by default.
ENV NODE_ENV $NODE_ENV

# Install dependencies first, as they change less often than code.
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force
COPY ./src ./src

# Copy the CSV file from the 'reference' folder to the root directory of the application.

COPY reference/indirizzi.csv /usr/src/app/reference/indirizzi.csv

COPY .env .

# Expose the port that the application listens on.
EXPOSE 5000

# Run the application.
CMD ["node", "./src/server.js"]






