package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// User struct matches your database columns
type User struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

var db *sql.DB

func main() {
	dbURL := os.Getenv("DB_URL")
	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}

	// Route for Registration, Login
	http.HandleFunc("/register", registerHandler)
	http.HandleFunc("/login", loginHandler)

	// Simple check route
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Backend is Live!")
	})

	fmt.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var u User
	// 1. Decode the JSON sent by the user
	err := json.NewDecoder(r.Body).Decode(&u)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 2. Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	// 3. Insert into the Database
	query := `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)`
	_, err = db.Exec(query, u.Username, u.Email, hashedPassword)
	if err != nil {
		http.Error(w, "User already exists or database error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, "User %s registered successfully!", u.Username)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var u User
	err := json.NewDecoder(r.Body).Decode(&u)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 1. Look up the user in the database
	var storedHash string
	query := `SELECT password_hash FROM users WHERE username = $1`
	err = db.QueryRow(query, u.Username).Scan(&storedHash)

	if err == sql.ErrNoRows {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// 2. Compare the provided password with the stored hash
	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(u.Password))
	if err != nil {
		// Passwords don't match
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	// 3. Success!
	fmt.Fprintf(w, "Login successful! Welcome back, %s.", u.Username)
}
