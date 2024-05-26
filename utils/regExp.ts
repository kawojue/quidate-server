const restrictedUsername: string[] = [
    "profile", "admin", "account", "api", "root", "user",
    "signup", "login", "edit", "password", "reset", "logout",
    "quidate", "account", "home", "reset", "auth", "main", "dashboard", "cash", "transfer", "facebook", "twitter", "fund", "funds", "create",
    "support", "contact", "help", "terms", "privacy", "about",
    "info", "settings", "config", "configuration", "control",
    "register", "register", "moderator", "mod", "administrator",
    "sysadmin", "superuser", "guest", "anonymous", "bot", "developer",
    "manager", "management", "owner", "news", "blog", "system",
    "status", "service", "services", "feedback", "report", "reports",
    "security", "secure", "inbox", "mail", "messages", "notification",
    "notifications", "alert", "alerts", "update", "updates", "subscribe",
    "unsubscribe", "verify", "validation", "public", "private", "internal",
    "external", "test", "testing", "sample", "beta", "alpha", "release"
]

export const USER_REGEX = new RegExp(`^(?!(?:${restrictedUsername.join('|')}))[a-zA-Z][a-zA-Z0-9-_]{2,14}$`)