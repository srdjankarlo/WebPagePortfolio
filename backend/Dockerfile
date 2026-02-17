# Use the official Go image
FROM golang:1.24-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the files from your computer to the container
COPY . .

# Build the Go app
RUN go build -o main .

# Tell Docker to run the app
CMD ["./main"]