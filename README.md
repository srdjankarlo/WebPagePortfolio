# WebPagePortfolio

A containerized, full-stack developer portfolio featuring interactive browser games, user authentication, and a global high-score leaderboard. 

## 🛠️ Tech Stack
* **Frontend**: React.js, Vite, Axios
* **Backend**: Go (Golang), JWT Authentication, lib/pq
* **Database**: PostgreSQL
* **Infrastructure**: Docker, Docker Compose
* **Debugging**: Delve (dlv-dap)

## 🚀 Features
* **Secure Authentication**: JWT-based registration and login system with encrypted password hashing (Bcrypt).
* **Interactive Arcade**: Includes a fully playable 15x15 Gomoku (Tic-Tac-Toe) game featuring a heuristic weighting AI.
* **Personal Best Tracking**: PostgreSQL `UPSERT` logic ensures only true high scores are saved to the database.
* **Global Scoreboard**: Dynamic SQL `JOIN` queries connect the scores table to the users table to display a Hall of Fame.
* **Cross-Device Testing**: Configured CORS and dynamic environment variables to allow testing from mobile devices over local Wi-Fi.

## ⚙️ Getting Started (Local Development)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running. Ensures app is running identically on any machine without installing specific programming languages locally.
* [Git](https://git-scm.com/install/) installed. For downloading this repository.
* [VS Code](https://code.visualstudio.com/download) installed. This is the project IDE.

### Installation

1.	**Clone the repository:**  
```bash
git clone <https://github.com/srdjankarlo/WebPagePortfolio.git>  
cd WebPagePortfolio
```

2.	**Configure Environment Variables:**
Copy .env.example and rename it to .env.
Replace the placeholder values with your local IP address and secure passwords.  
MY_IP=192.168.x.x  
MY_JWT_KEY=your_secure_random_key  
DB_PASSWORD=your_secure_password

3.	**Launch the Application:**
Run the following command to build the images and start the containers:
docker compose -f docker-compose.dev.yml up -d --build
4.	**Access the Site:**
Open your browser and navigate to:
* Local: http://localhost:3000
* Mobile: http://<YOUR_IP>:3000

**Debugging**  
This project is configured for remote debugging using VS Code and Delve.
Ensure containers are running.
Open the project root in VS Code.
Set a breakpoint in your Go or React code.
Navigate to the **Run & Debug** panel.
Select **Connect to Go Backend (Docker)** or **Launch Chrome for React Frontend** and hit Play.  
Note: If backend breakpoints remain "Unbound" (gray), verify that the substitutePath in .vscode/launch.json perfectly matches your local absolute path to the /backend directory.
