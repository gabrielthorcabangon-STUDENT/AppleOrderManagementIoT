# Apple Store Analytics — Liquid Glass Data Dashboard (COMPROG1 Final Project)

An end-to-end Python data processing and interactive web visualization dashboard styled with a **40% frosted Liquid Glass** design system.

## Repository & Branch Architecture
- **`main`**: Protected baseline branch. Merges require a Pull Request approved by the repository owner.
- **`html`**: HTML layout & semantic structure (`index.html`) — *1 Frontend Developer*.
- **`css`**: Liquid Glass styling & responsive layout (`styles/liquid-glass.css`) — *1 Frontend Developer*.
- **`js`**: Interactive filtering, Chart.js visualizations & DOM rendering (`scripts/dashboard.js`) — *1 Frontend Developer*.
- **`python`**: Pandas/NumPy ingestion, ratio calculation & JSON export (`src/pipeline.py`, `data/`) — *2 Python Developers*.

## Setup & Launch Instructions
1. **Run the Python Data Pipeline:**
   ```bash
   pip install pandas numpy
   python src/pipeline.py
   ```
2. **Launch the Local Web Dashboard:**
   ```bash
   python -m http.server 8000
   ```
   Open `http://localhost:8000` in your browser.
