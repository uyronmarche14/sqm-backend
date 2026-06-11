IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'PASSWORD_RESET_TOKENS'
)
BEGIN
    CREATE TABLE dbo.PASSWORD_RESET_TOKENS (
        password_reset_token_id nvarchar(72) NOT NULL PRIMARY KEY,
        user_id nvarchar(72) NOT NULL,
        token_hash nvarchar(128) NOT NULL,
        expires_at datetime NOT NULL,
        used_at datetime NULL,
        created_at datetime NOT NULL,
        last_update datetime NULL,
        updateby nvarchar(100) NULL
    );

    CREATE INDEX IX_PASSWORD_RESET_TOKENS_USER_ID
        ON dbo.PASSWORD_RESET_TOKENS (user_id);

    CREATE UNIQUE INDEX IX_PASSWORD_RESET_TOKENS_TOKEN_HASH
        ON dbo.PASSWORD_RESET_TOKENS (token_hash);
END;
