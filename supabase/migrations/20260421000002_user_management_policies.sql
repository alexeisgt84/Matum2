-- Políticas para que los administradores puedan gestionar usuarios
CREATE POLICY "Admins can view all users" 
    ON users FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all users" 
    ON users FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
