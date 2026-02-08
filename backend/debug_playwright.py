from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        print("Navigating...")
        try:
            page.goto("http://127.0.0.1:5173/auth", timeout=5000)
            print("Title:", page.title())
        except Exception as e:
            print("Error:", e)
        browser.close()

if __name__ == "__main__":
    run()
