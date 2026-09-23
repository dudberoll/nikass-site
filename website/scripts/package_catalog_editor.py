from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "dist"
OUTPUT = ROOT / "nikass-catalog-editor.zip"
ARCHIVE_ROOT = "nikass-catalog-editor"

LAUNCHER = '''#!/usr/bin/env python3
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
import webbrowser

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:4325/catalog-editor/"

try:
    server = ThreadingHTTPServer(("127.0.0.1", 4325), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
except OSError:
    print("Не удалось открыть локальный редактор: порт 4325 занят. Закройте другое окно редактора и запустите файл снова.")
    input("Нажмите Enter, чтобы закрыть окно. ")
    raise SystemExit(1)

print("Редактор открыт в браузере. Не закрывайте это окно, пока работаете.")
print("Чтобы остановить редактор, нажмите Ctrl+C.")
Timer(0.5, lambda: webbrowser.open(URL)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.server_close()
'''

MAC_LAUNCHER = '''#!/bin/sh
cd "$(dirname "$0")"
python3 launch-catalog-editor.py
'''

WINDOWS_LAUNCHER = '''@echo off
cd /d "%~dp0"
py -3 launch-catalog-editor.py
if errorlevel 1 pause
'''

START_HERE = '''NIKASS — локальный редактор каталога

macOS: дважды щёлкните Start Catalog Editor.command.
Windows: дважды щёлкните Start Catalog Editor.bat.

Откроется локальная копия сайта и редактор каталога. Оставьте это окно
открытым, пока редактируете. Для остановки нажмите Ctrl+C.

Правки автоматически сохраняются в профиле браузера на этом компьютере.
Нажмите «Скачать правки», чтобы создать JSON-файл для резервной копии или
передачи владельцу сайта. Для переноса на другой компьютер используйте
«Импортировать JSON».

Редактору не нужны учётные данные WooCommerce или подключение к backend.
Python 3 нужен только для локального запуска архива. Если он не установлен,
установите Python 3 и запустите файл ещё раз.

Это копия для подготовки каталога: оформить заказ, проверить остатки или пользоваться AI-консультантом в ней нельзя.
'''


def add_text(archive: ZipFile, name: str, value: str, mode: int = 0o100644) -> None:
    info = ZipInfo(f"{ARCHIVE_ROOT}/{name}")
    info.external_attr = mode << 16
    archive.writestr(info, value.encode("utf-8"))


def main() -> None:
    if not (BUILD / "catalog-editor" / "index.html").is_file():
        raise SystemExit("Не найдена собранная страница редактора. Сначала выполните bun run catalog:editor:package.")

    with ZipFile(OUTPUT, "w", ZIP_DEFLATED, compresslevel=6) as archive:
        for source in BUILD.rglob("*"):
            if source.is_file():
                archive.write(source, f"{ARCHIVE_ROOT}/{source.relative_to(BUILD)}")
        add_text(archive, "launch-catalog-editor.py", LAUNCHER)
        add_text(archive, "Start Catalog Editor.command", MAC_LAUNCHER, 0o100755)
        add_text(archive, "Start Catalog Editor.bat", WINDOWS_LAUNCHER)
        add_text(archive, "START-HERE.txt", START_HERE)

    print(f"Готово: {OUTPUT}")


if __name__ == "__main__":
    main()
