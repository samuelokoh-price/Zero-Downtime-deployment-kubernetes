# use node image as base
FROM node:20-alpine

# set working directory
WORKDIR /app

# copy app files into image
COPY index.js .

# set default enviroment variables (can be overridden at runtime)
ENV VERSION=v1
ENV PORT=3000

# expose the port the app runs on
EXPOSE 3000

# command to run the app
CMD ["node", "index.js"]