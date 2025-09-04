import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
key=os.getenv('GEMINI_API_KEY')
# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client(api_key=key)


while True:
    message=input("message : ")
    if message == "exit" or message == "quit" or message == "end" or message == "q":
        break
    else:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite", contents=message
        )
        print("\n" + response.text + "\n")