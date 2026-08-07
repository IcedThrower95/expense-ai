# Expense AI

​Role & Goal:

Act as an expert full-stack developer and UI/UX designer. I want you to build an "AI Bank Statement Analyzer and Categorizer" web application. The app will allow users to upload a bank statement PDF, extract the text/transaction data, and use an LLM (like OpenAI) to automatically categorize every spend into a very specific custom dashboard.

​Core Features & Tech Stack:

​Frontend: React (Next.js preferred), Tailwind CSS, and Shadcn UI for a clean, modern, modern financial dashboard aesthetic.

 ​File Handling: Include a drag-and-drop zone for PDF uploads. Use a library like pdfjs-dist or pdf-parse to extract text from multi-page PDFs.

​AI Integration: Create an API route that takes the parsed PDF text, structures it into JSON (Date, Description, Amount), and passes it to an LLM with strict categorization prompts.

​Data Visualization: Use Recharts to display a pie chart of spending categories and a clean data table for individual transactions.

​The AI Categorization Logic (Crucial):

The backend prompt that analyzes the transactions must strictly categorize the data into the following custom buckets based on the transaction descriptions and amounts:

​Shopping - Apparel & Shoes: Flag this in the UI as "Good Shopping" (brands, clothing stores, shoe stores).

​Shopping - Electronics & Other: General retail, electronics, gadgets.

​Food - Delivery & Quick Commerce: Explicitly filter for keywords like "Swiggy", "Zomato", "Zepto", "Blinkit", or "Instamart".

​Food - Dining Out: Restaurants, cafes, and bars that are physically visited.

​Daily Essentials & Micro-spends: Small amount transactions ( generic UPI payments), local grocery shops, and street vendors (e.g., street food like Pani Puri).

​UI Requirements:

​Header: "AI Expense Analyzer".

​Main View: A drag-and-drop upload box. Include a loading state with a spinner that says "AI is analyzing your statement...".

 ​Results Dashboard:

​Top cards showing "Total Spent", "Top Category", and "Biggest Expense".

​A colorful Pie Chart showing the breakdown of the 5 categories listed above.

​A paginated Table below listing every transaction with columns: Date | Description | Amount | AI Category. Implement a feature where the user can manually edit the AI's category if it guessed incorrectly.

​Please generate the complete frontend code, the PDF extraction logic, and the backend LLM prompt structure required to make this work. Ensure the UI is responsive and looks like a premium fintech product.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e74b1860-48b0-4116-ab1a-6aa6ea548152).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
