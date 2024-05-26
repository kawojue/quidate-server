const restrictedUsername: string[] = [
    "profile", "admin", "account", "api", "root", "user",
    "signup", "login", "edit", "password", "reset", "logout",
    "quidate", "account", "home", "reset", "auth", "main", "dashboard", "cash", "transfer", "facebook", "twitter", "fund", "funds", "create"
]

export const USER_REGEX = new RegExp(`^(?!(?:${restrictedUsername.join('|')}))[a-zA-Z][a-zA-Z0-9-_]{2,14}$`)