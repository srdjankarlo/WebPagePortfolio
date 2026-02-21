package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// secret key for signing tokens - In production, this goes in a .env file!
var jwtKey = []byte("my_ultra_secret_key")

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// User struct matches your database columns
type User struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Score struct {
	Username string `json:"username"`
	GameName string `json:"game_name"`
	Score    int    `json:"score"`
}

var db *sql.DB

func main() {
	dbURL := os.Getenv("DB_URL")
	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}

	// Register handlers
	http.HandleFunc("/register", registerHandler)
	http.HandleFunc("/login", loginHandler)
	http.Handle("/submit-score", AuthMiddleware(http.HandlerFunc(submitScoreHandler)))
	http.HandleFunc("/leaderboard", leaderboardHandler)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Backend is Live!")
	})

	fmt.Println("Server starting on port 8080...")

	// FIX 1: Pass http.DefaultServeMux so the middleware knows where to send requests
	log.Fatal(http.ListenAndServe(":8080", enableCORS(http.DefaultServeMux)))
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// FIX 2: Handle optional email for the database
	var emailToInsert interface{}
	if u.Email == "" {
		emailToInsert = nil // This tells Postgres to store NULL, which allows multiple users to have no email
	} else {
		emailToInsert = u.Email
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	query := `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)`
	_, err = db.Exec(query, u.Username, emailToInsert, hashedPassword)
	if err != nil {
		fmt.Println("DB Insert Error:", err)

		// Check if the error is a duplicate key violation
		if strings.Contains(err.Error(), "unique constraint") {
			if strings.Contains(err.Error(), "username") {
				http.Error(w, "Username already taken. Please choose another.", http.StatusConflict)
				return
			}
			if strings.Contains(err.Error(), "email") {
				http.Error(w, "Email is already registered.", http.StatusConflict)
				return
			}
		}

		http.Error(w, "Database error: Unable to complete registration.", http.StatusInternalServerError)
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

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: u.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)

	// if err != nil {
	// 	http.Error(w, "Error generating token", 500)
	// 	return
	// }
	w.Header().Set("Content-Type", "application/json")
	// Send the token back to the user
	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing token", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil {
			// THIS LOG WILL TELL US THE TRUTH
			fmt.Printf("JWT Validation Error: %v\n", err)
			http.Error(w, "Invalid token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		if !token.Valid {
			http.Error(w, "Invalid token: token not valid", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "username", claims.Username)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func submitScoreHandler(w http.ResponseWriter, r *http.Request) {
	username := r.Context().Value("username").(string)
	var s Score
	json.NewDecoder(r.Body).Decode(&s)

	// Only update if the incoming score is GREATER than what we already have
	query := `
        INSERT INTO scores (user_id, game_name, score) 
        SELECT id, $1, $2 FROM users WHERE username = $3
        ON CONFLICT (user_id, game_name) 
        DO UPDATE SET score = EXCLUDED.score
        WHERE EXCLUDED.score > scores.score;`

	result, err := db.Exec(query, s.GameName, s.Score, username)
	if err != nil {
		fmt.Println("Upsert Error:", err)
		http.Error(w, "Database error", 500)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		fmt.Println("Score not updated because it wasn't a new High Score.")
	}

	fmt.Fprintf(w, "Score processed")
}

func leaderboardHandler(w http.ResponseWriter, r *http.Request) {
	gameName := r.URL.Query().Get("game")

	var query string
	var rows *sql.Rows
	var err error

	if gameName != "" {
		// Specific game
		query = `SELECT u.username, s.game_name, s.score FROM scores s 
                 JOIN users u ON s.user_id = u.id WHERE s.game_name = $1 
                 WHERE 	s.score > 0
				 ORDER BY s.score DESC LIMIT 20`
		rows, err = db.Query(query, gameName)
	} else {
		// Global Leaderboard (Every game)
		query = `SELECT u.username, s.game_name, s.score FROM scores s 
                 JOIN users u ON s.user_id = u.id 
                 WHERE 	s.score > 0
				 ORDER BY s.score DESC LIMIT 20`
		rows, err = db.Query(query)
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var leaderboard []Score
	for rows.Next() {
		var ls Score
		// You must scan all 3 columns returned by the query
		if err := rows.Scan(&ls.Username, &ls.GameName, &ls.Score); err != nil {
			fmt.Println("Scan error:", err)
			continue
		}
		leaderboard = append(leaderboard, ls)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leaderboard)
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow your React dev server
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle the "preflight" request browser sends before the actual POST
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
