# **Knowledge Base Platform**

A full-stack web application designed for collaborative document creation, management, and sharing, inspired by platforms like Confluence. This project demonstrates core functionalities including user authentication, rich document editing, version control, privacy controls, search, and basic user collaboration features.

## **Table of Contents**

1. [Features](https://www.google.com/search?q=%23features)  
2. [Technologies Used](https://www.google.com/search?q=%23technologies-used)  
3. [Getting Started](https://www.google.com/search?q=%23getting-started)  
   * [Prerequisites](https://www.google.com/search?q=%23prerequisites)  
   * [1\. Database Setup (MySQL)](https://www.google.com/search?q=%231-database-setup-mysql)  
   * [2\. Backend Setup](https://www.google.com/search?q=%232-backend-setup)  
   * [3\. Frontend Setup](https://www.google.com/search?q=%233-frontend-setup)  
4. [Running the Application](https://www.google.com/search?q=%23running-the-application)  
5. [Key Functionality & Testing](https://www.google.com/search?q=%23key-functionality--testing)  
   * [Registering a New User](https://www.google.com/search?q=%23registering-a-new-user)  
   * [Logging In](https://www.google.com/search?q=%23logging-in)  
   * [Document Management](https://www.google.com/search?q=%23document-management)  
   * [Sharing Documents](https://www.google.com/search?q=%23sharing-documents)  
   * [Version History & Comparison](https://www.google.com/search?q=%23version-history--comparison)  
   * [Search Functionality](https://www.google.com/search?q=%23search-functionality)  
   * [Forgot/Reset Password](https://www.google.com/search?q=%23forgotreset-password)  
6. [Important Notes](https://www.google.com/search?q=%23important-notes)  
7. [License](https://www.google.com/search?q=%23license)

## **1\. Features**

* **User Authentication:**  
  * User registration (via API).  
  * User login with JWT-based authentication.  
  * Forgot and Reset Password functionality via email.  
* **Document Management:**  
  * Create new documents with a title and content.  
  * Rich text editing using react-quill (WYSIWYG editor).  
  * View and edit existing documents.  
  * Global search across document titles and content.  
* **Privacy Controls:**  
  * Set document visibility as private (default) or public.  
  * Manage sharing with other users (add/remove access).  
  * Grant view or edit permissions to shared users.  
* **Version Control & History:**  
  * Automatically track changes to document content.  
  * View a list of all historical versions with timestamps and modifier.  
  * Compare any past version with the current document content (basic diff view).  
* **User Collaboration (Basic):**  
  * Auto-sharing: If another user's email is typed as @user@example.com in the document content and saved, that user automatically gains view access to the document.

## **2\. Technologies Used**

* **Backend:** Node.js, Express.js  
* **Database:** MySQL (via mysql2/promise for async operations)  
* **Authentication:** JWT (JSON Web Tokens), bcryptjs for password hashing  
* **Email Service:** Nodemailer (for password reset emails)  
* **Frontend:** React.js (with Vite for fast development)  
* **Styling:** Tailwind CSS  
* **UI Components:** react-quill (WYSIWYG editor), react-router-dom (routing), axios (HTTP client), diff-match-patch (for version comparison).

## **3\. Getting Started**

Follow these steps to set up and run the project on your local machine.

### **Prerequisites**

Before you begin, ensure you have the following installed:

* **Node.js (LTS version recommended):** Download from [nodejs.org](https://nodejs.org/).  
* **MySQL Server:** Install MySQL Community Server.  
* **MySQL Client:** MySQL Workbench (recommended), DBeaver, or the command-line client.

### **1\. Database Setup (MySQL)**

1. **Open your MySQL Client** (e.g., MySQL Workbench).  
2. **Connect to your local MySQL server** as a user with administrative privileges (e.g., root). Use your Local instance MySQL80 connection.  
3. **Open a new SQL query tab.**  
4. **Execute the following SQL commands** to create the database, tables, and a dedicated database user for your application.  
   \-- Create the database if it doesn't exist  
   CREATE DATABASE IF NOT EXISTS knowledge\_base1;

   \-- Use the database  
   USE knowledge\_base1;

   \-- Table for Users  
   CREATE TABLE IF NOT EXISTS users (  
       id INT AUTO\_INCREMENT PRIMARY KEY,  
       email VARCHAR(255) NOT NULL UNIQUE,  
       password VARCHAR(255) NOT NULL,  
       created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP  
   );

   \-- Table for Documents  
   CREATE TABLE IF NOT EXISTS documents (  
       id INT AUTO\_INCREMENT PRIMARY KEY,  
       user\_id INT NOT NULL,  
       title VARCHAR(255) NOT NULL,  
       content TEXT,  
       visibility ENUM('private', 'public') DEFAULT 'private',  
       created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
       updated\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP ON UPDATE CURRENT\_TIMESTAMP,  
       FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE  
   );

   \-- Table for Document Versions (for history)  
   CREATE TABLE IF NOT EXISTS document\_versions (  
       version\_id INT AUTO\_INCREMENT PRIMARY KEY,  
       document\_id INT NOT NULL,  
       version\_number INT NOT NULL,  
       content TEXT,  
       modified\_by INT,  
       modified\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
       FOREIGN KEY (document\_id) REFERENCES documents(id) ON DELETE CASCADE,  
       FOREIGN KEY (modified\_by) REFERENCES users(id) ON DELETE SET NULL,  
       UNIQUE (document\_id, version\_number)  
   );

   \-- Table for Document Sharing  
   CREATE TABLE IF NOT EXISTS document\_shares (  
       share\_id INT AUTO\_INCREMENT PRIMARY KEY,  
       document\_id INT NOT NULL,  
       user\_id INT NOT NULL,  
       permission ENUM('view', 'edit') NOT NULL,  
       shared\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
       FOREIGN KEY (document\_id) REFERENCES documents(id) ON DELETE CASCADE,  
       FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE,  
       UNIQUE (document\_id, user\_id)  
   );

   \-- Table for Password Reset Tokens  
   CREATE TABLE IF NOT EXISTS password\_reset\_tokens (  
       id INT AUTO\_INCREMENT PRIMARY KEY,  
       user\_id INT NOT NULL,  
       token VARCHAR(255) NOT NULL UNIQUE,  
       expires\_at DATETIME NOT NULL,  
       created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,  
       FOREIGN KEY (user\_id) REFERENCES users(id) ON DELETE CASCADE  
   );

   \-- Create the dedicated application user 'SEA' and grant permissions  
   \-- IMPORTANT: If 'SEA'@'localhost' already exists, skip the CREATE USER line  
   \-- or use ALTER USER 'SEA'@'localhost' IDENTIFIED BY 'root'; if you need to change the password.  
   CREATE USER 'SEA'@'localhost' IDENTIFIED BY 'root'; \-- 'root' is the password for user 'SEA'

   \-- Grant all necessary privileges on the 'knowledge\_base1' database to 'SEA'@'localhost'  
   GRANT ALL PRIVILEGES ON knowledge\_base1.\* TO 'SEA'@'localhost';

   \-- Apply the changes immediately  
   FLUSH PRIVILEGES;

5. **Verify:** Check the "Output" panel in your MySQL client for green checkmarks, indicating successful execution.

### **2\. Backend Setup**

1. **Navigate to the server directory:**  
   cd knowledge-base/server

2. **Create a .env file:** In this server directory, create a file named .env and add the following content.  
   * **Crucial:** Ensure DB\_USER and DB\_PASSWORD match the user (SEA) and password (root) you set in the database setup step.  
   * **Email Configuration:** If you want the "Forgot Password" feature to send actual emails, fill in EMAIL\_USER and EMAIL\_PASS with your email service credentials (e.g., Gmail App Password). Otherwise, leave them empty.

DB\_HOST=localhost  
DB\_USER=SEA  
DB\_PASSWORD=root  
DB\_NAME=knowledge\_base1  
JWT\_SECRET=supersecretkey  
PORT=5000

EMAIL\_USER=  
EMAIL\_PASS=

3. **Install backend dependencies:**  
   npm install

4. **Start the backend server:**  
   npm run dev

   You should see messages like ✅ Connected to MySQL database\! and ✅ Server running on port 5000\. Keep this terminal window open.

### **3\. Frontend Setup**

1. **Open a NEW terminal or command prompt window.**  
2. **Navigate to the client directory:**  
   cd knowledge-base/client

3. **Verify index.html location:** Ensure index.html is **directly inside** the client folder (NOT client/public/). If it's in public, move it out.  
4. **Verify index.html content:** Open knowledge-base/client/index.html and ensure the \<script\> tag is src="/src/main.jsx".  
5. **Install frontend dependencies:**  
   npm install

6. **Start the frontend development server:**  
   npm run dev

   Your browser should automatically open to http://localhost:5173/. You should see the **Login page**.

## **4\. Running the Application**

* Ensure both the **backend server** (npm run dev in server directory) and the **frontend development server** (npm run dev in client directory) are running in separate terminal windows.  
* Access the application in your browser at: http://localhost:5173/

## **5\. Key Functionality & Testing**

### **Registering a New User**

The UI does not have a direct registration form. You must register users via the backend API.

1. **Open your browser's Developer Tools** (F12) on the login page (http://localhost:5173/).  
2. Go to the **Console tab**.  
3. **Paste and run the following JavaScript code.** **Remember to change the email and password** to your desired credentials. Repeat this step for each user you want to create (e.g., user1@example.com, user2@example.com):  
   fetch('http://localhost:5000/api/auth/register', {  
       method: 'POST',  
       headers: { 'Content-Type': 'application/json' },  
       body: JSON.stringify({  
           email: 'user1@example.com', // CHANGE THIS EMAIL  
           password: 'password123'     // CHANGE THIS PASSWORD  
       })  
   })  
   .then(response \=\> {  
       if (\!response.ok) {  
           return response.json().then(errorData \=\> {  
               throw new Error(errorData.error || 'Registration failed with unknown error');  
           });  
       }  
       return response.json();  
   })  
   .then(data \=\> {  
       console.log('Registration Success:', data);  
       console.log('User registered\! You can now try logging in with this email and password.');  
   })  
   .catch(error \=\> {  
       console.error('Registration Error:', error.message);  
   });

4. Check the console for a "Registration Success" message.

### **Logging In**

1. Go to http://localhost:5173/.  
2. Enter the email and password of a user you registered in the previous step.  
3. Click "Login". You should be redirected to the Dashboard.

### **Document Management**

* **Create Document:** On the Dashboard, use the "Create New Document" form. Provide a title and select visibility.  
* **Edit Document:** Click on any document in the list to open its editor. Make changes to the title or content. Changes auto-save after a short delay, or you can click "Save Document".

### **Sharing Documents**

1. Log in as the owner of a document.  
2. On the document page, scroll down to the "Sharing Options" section.  
3. Enter the email of another registered user and select their permission (View or Edit).  
4. Click "Share Document".  
5. Log out and log in as the shared user. The document should appear under "Documents Shared With Me".  
6. You can also "Remove" sharing from the owner's document page.

### **Version History & Comparison**

1. On a document's editor page, make some changes and save.  
2. Scroll to the "Version History" section.  
3. Click "View Version" to see a past version's content.  
4. Click "Compare with Current" to see a visual diff highlighting additions (green) and deletions (red) between a past version and the current content.

### **Search Functionality**

1. On the Dashboard, use the search bar at the top.  
2. Type keywords to filter documents by title or content.

### **Forgot/Reset Password**

1. From the Login page, click "Forgot Password?".  
2. Enter the email of a registered user.  
3. If your email credentials are set up in server/.env, you will receive a password reset link in your inbox.  
4. Click the link in the email, which will take you to the "Reset Password" page.  
5. Enter and confirm your new password.  
6. You can then log in with your updated password.

## **6\. Important Notes**

* **Security:** This project focuses on core functionality. For a production environment, further security enhancements (e.g., more robust input validation, rate limiting, stricter CORS policies, HTTPS, proper error logging, environment variable management) would be necessary.  
* **User Registration:** As noted, user registration is currently via API only. For a user-friendly application, you would integrate a registration form into the frontend.  
* **Email Service:** The "Forgot Password" feature relies on your EMAIL\_USER and EMAIL\_PASS in .env. If these are not configured, emails will not be sent.  
* **User Mentions:** The auto-sharing for mentions is a basic implementation. A full-fledged mention system might involve real-time suggestions, notifications, and more sophisticated parsing.

## **7\. License**

This project is open-source. Feel free to use, modify, and distribute it.

LOGIN DETAILS:-
                EMAIL :- syedsiddiq007@gmail.com
                PASSWORD :- syedsiddiq007