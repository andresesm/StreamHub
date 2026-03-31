import os
from pathlib import Path

path = Path(os.environ["TARGET_FILE"])
html = path.read_text(encoding="utf-8")

replacements = {
    "PH-STREAMER-USERNAME": os.environ["USERNAME"],
    "PH-STREAMER-DISPLAYNAME": os.environ["DISPLAYNAME"],
    "PH-STREAMER-NAME": os.environ["DISPLAYNAME"],
    "PH-STREAMER-DATAKEY": os.environ["DATAKEY"],
    "PH-STREAMER-TITLE": os.environ["TITLE"],
    "PH-STREAMER-DESCRIPTION": os.environ["DESCRIPTION"],
    "PH-STREAMER-CANONICAL": os.environ["CANONICAL"],
    "PH-STREAMER-OG-URL": os.environ["OG_URL"],
    "PH-STREAMER-AVATAR": os.environ["AVATAR"],
    "PH-STREAMER-BIO-SHORT": os.environ["BIO_SHORT"],
    "PH-STREAMER-CATEGORY": os.environ["CATEGORY"],
}

for k, v in replacements.items():
    html = html.replace(k, v)

def valid(value: str) -> bool:
    value = (value or "").strip()
    return value != "" and value != "null" and value != "PH-LINKPENDING"

buttons = []

if valid(os.environ["PH_LINK_TWITCH"]) and valid(os.environ["PH_TEXT_TWITCH"]):
    buttons.append(f"""            <a class="link-btn link-btn--twitch" href="{os.environ["PH_LINK_TWITCH"]}" target="_blank" rel="noopener noreferrer">
              <span class="link-icon brand-twitch" aria-hidden="true"></span>
              <span class="link-copy">
                <strong>Twitch</strong>
                <small>{os.environ["PH_TEXT_TWITCH"]}</small>
              </span>
            </a>""")

if valid(os.environ["PH_LINK_KICK"]) and valid(os.environ["PH_TEXT_KICK"]):
    buttons.append(f"""            <a class="link-btn link-btn--kick" href="{os.environ["PH_LINK_KICK"]}" target="_blank" rel="noopener noreferrer">
              <span class="link-icon brand-kick" aria-hidden="true"></span>
              <span class="link-copy">
                <strong>Kick</strong>
                <small>{os.environ["PH_TEXT_KICK"]}</small>
              </span>
            </a>""")

if valid(os.environ["PH_LINK_YOUTUBE"]) and valid(os.environ["PH_TEXT_YOUTUBE"]):
    buttons.append(f"""            <a class="link-btn link-btn--youtube" href="{os.environ["PH_LINK_YOUTUBE"]}" target="_blank" rel="noopener noreferrer">
              <span class="link-icon brand-youtube" aria-hidden="true"></span>
              <span class="link-copy">
                <strong>YouTube</strong>
                <small>{os.environ["PH_TEXT_YOUTUBE"]}</small>
              </span>
            </a>""")

if valid(os.environ["PH_LINK_TIKTOK"]) and valid(os.environ["PH_TEXT_TIKTOK"]):
    buttons.append(f"""            <a class="link-btn link-btn--tiktok" href="{os.environ["PH_LINK_TIKTOK"]}" target="_blank" rel="noopener noreferrer">
              <span class="link-icon brand-tiktok" aria-hidden="true"></span>
              <span class="link-copy">
                <strong>TikTok</strong>
                <small>{os.environ["PH_TEXT_TIKTOK"]}</small>
              </span>
            </a>""")

if valid(os.environ["PH_LINK_IG"]) and valid(os.environ["PH_TEXT_IG"]):
    buttons.append(f"""            <a class="link-btn link-btn--instagram" href="{os.environ["PH_LINK_IG"]}" target="_blank" rel="noopener noreferrer">
              <span class="link-icon brand-instagram" aria-hidden="true"></span>
              <span class="link-copy">
                <strong>Instagram</strong>
                <small>{os.environ["PH_TEXT_IG"]}</small>
              </span>
            </a>""")

if valid(os.environ["PH_LINK_X"]) and valid(os.environ["PH_TEXT_X"]):
    buttons.append(f"""            <a class="link-btn link-btn--x" href="{os.environ["PH_LINK_X"]}" target="_blank" rel="noopener noreferrer">
              <span class="link-icon brand-x" aria-hidden="true"></span>
              <span class="link-copy">
                <strong>X</strong>
                <small>{os.environ["PH_TEXT_X"]}</small>
              </span>
            </a>""")

if valid(os.environ["PH_LINK_EMAIL"]) and valid(os.environ["PH_TEXT_EMAIL"]):
    buttons.append(f"""            <a class="link-btn link-btn--email" href="{os.environ["PH_LINK_EMAIL"]}">
              <span class="link-icon brand-email" aria-hidden="true"></span>
              <span class="link-copy">
                <strong>Email</strong>
                <small>{os.environ["PH_TEXT_EMAIL"]}</small>
              </span>
            </a>""")

social_buttons_html = "\n\n".join(buttons)
html = html.replace("PH-SOCIAL-BUTTONS", social_buttons_html)

path.write_text(html, encoding="utf-8")