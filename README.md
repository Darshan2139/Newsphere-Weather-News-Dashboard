# 📰🌤️Newsphere - Weather & News Dashboard
Newsphere is a personal dashboard that provides real-time weather updates and the latest news. It integrates OAuth authentication using Google and GitHub, allowing users to securely log in and access personalized features.
---

## 🖥️Preview
### Login Page
![Login Page](./Preview%20Images/Login%20Page.png)
### Dashboard
![Dashboard ](./Preview%20Images/Dashboard.png)

---
## 🚀Features

- **Weather Updates**: Get real-time weather information for any city, including temperature, humidity, wind speed, and more.
- **News Headlines**: Browse the latest news articles by category (e.g., General, Business, Technology, Sports, Entertainment).
- **OAuth Authentication**: Secure login using Google or GitHub accounts.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Secure Backend**: Includes rate limiting, helmet for security headers, and session management.
---
## 📁Project Structure

### Key Files

- **`server.js`**: Backend server built with Express.js, handling authentication, API routes, and static file serving.
- **`public/index.html`**: Frontend HTML file with a responsive design for the dashboard.
- **`public/app.js`**: JavaScript file for handling frontend logic, including authentication, weather, and news API integration.
- **`.env`**: Environment variables for configuration (e.g., API keys, OAuth credentials).
---
## ⚙️Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a .env file in the root directory and configure the following variables::
  
### Environment Variables

Create a `.env` file in the root directory and add the following variables:

```plaintext
PORT=3000
NODE_ENV=development
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
WEATHER_API_KEY=<your-openweathermap-api-key>
NEWS_API_KEY=<your-newsapi-key>
```
4. Generate a secure JWT secret using the generate-secret.js script:
   ```bash
   node generate-secret.js

5. Replace the JWT_SECRET value in the .env file with the generated secret.:
---
## 🗂️Usage

1. Start the server:

   ```bash
   npm start

   ```
2. Open your browser and navigate to:
`http://localhost:3000`.

3. Log in using Google or GitHub to access the dashboard.
---
## 🌐API Endpoints
### Authentication
GET /auth/google: Initiates Google OAuth login.
GET /auth/github: Initiates GitHub OAuth login.
POST /auth/logout: Logs out the user.
Weather
GET /api/weather/:city: Fetches weather data for the specified city.
News
GET /api/news/:category: Fetches news articles for the specified category.

## 🛠️Technologies Used

- **Frontend:** HTML, CSS, JavaScript.
- **Backend:** Node.js.  
- **Database:** MongoDB  
- **Authentication:** Passport.js (Google & GitHub OAuth)  
- **APIs:** OpenWeatherMap, NewsAPI  
---
## 🛡️Security Features

- **Helmet:** Adds security headers to protect against common vulnerabilities.  
- **Rate Limiting:** Limits the number of requests per IP to prevent abuse.  
- **Session Management:** Securely manages user sessions with `express-session`.
---
## 🙌Acknowledgments

- [OpenWeatherMap API](https://openweathermap.org/api)  
- [NewsAPI](https://newsapi.org/)  
- [Bootstrap](https://getbootstrap.com/)  
- [Font Awesome](https://fontawesome.com/)
---
## 🌐 Connect With Us

- GitHub: [github.com/Darshan2139](https://github.com/Darshan2139/Newsphere-Weather-News-Dashboard)
- Email: darshankachhiya.ce@gmail.com