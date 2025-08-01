-- 監査テーブルを作成
CREATE TABLE IF NOT EXISTS database_audit_log (
    id SERIAL PRIMARY KEY,
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_name TEXT DEFAULT CURRENT_USER,
    client_addr INET DEFAULT inet_client_addr(),
    client_port INTEGER DEFAULT inet_client_port(),
    session_user TEXT DEFAULT session_user(),
    command_tag TEXT,
    query TEXT
);

-- イベントトリガー関数を作成
CREATE OR REPLACE FUNCTION log_ddl_commands()
RETURNS event_trigger AS $$
BEGIN
    INSERT INTO database_audit_log (command_tag, query)
    VALUES (TG_TAG, current_query());
END;
$$ LANGUAGE plpgsql;

-- DROP系コマンドを監視するイベントトリガー
DROP EVENT TRIGGER IF EXISTS log_drop_commands;
CREATE EVENT TRIGGER log_drop_commands
ON ddl_command_end
WHEN TAG IN ('DROP DATABASE', 'DROP TABLE', 'DROP SCHEMA')
EXECUTE FUNCTION log_ddl_commands();