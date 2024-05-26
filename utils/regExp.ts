const restrictedUsername: string[] = [
    "profile", "admin", "account", "api",
    "root", "user", "signup", "login", "edit",
    "password", "reset", "logout", "quidate", "account",
    "home", "reset", "auth", "main", "dashboard", "cash",
    "info", "settings", "config", "configuration", "control",
    "support", "contact", "help", "terms", "privacy", "about",
    "manager", "management", "owner", "news", "blog", "system",
    "register", "register", "moderator", "mod", "administrator",
    "transfer", "facebook", "twitter", "fund", "funds", "create",
    "status", "service", "services", "feedback", "report", "reports",
    "sysadmin", "superuser", "guest", "anonymous", "bot", "developer",
    "security", "secure", "inbox", "mail", "messages", "notification",
    "external", "test", "testing", "sample", "beta", "alpha", "release",
    "notifications", "alert", "alerts", "update", "updates", "subscribe",
    "unsubscribe", "verify", "validation", "public", "private", "internal",
]

export const USER_REGEX = new RegExp(`^(?!(?:${restrictedUsername.join('|')}))[a-zA-Z][a-zA-Z0-9-_]{2,14}$`)