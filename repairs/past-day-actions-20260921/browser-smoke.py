"""Optional browser smoke check; requires the local app on port 4191 and an empty test tab."""
import base64
import http.client
import json
import os
from pathlib import Path
import socket
import time
import websocket

OUT = Path(__file__).parent


def devtools_socket():
    connection = socket.socket(socket.AF_UNIX)
    connection.settimeout(10)
    connection.connect("\0chrome_devtools_remote")
    return connection


connection = devtools_socket()
connection.sendall(b"GET /json/list HTTP/1.1\r\nHost: localhost\r\n\r\n")
response = http.client.HTTPResponse(connection)
response.begin()
page = next(p for p in json.loads(response.read()) if p.get("url") == "http://127.0.0.1:4191/")
connection.close()
ws = websocket.create_connection(page["webSocketDebuggerUrl"], socket=devtools_socket(), suppress_origin=True, timeout=10)
sequence = 0
errors = []


def call(method, params=None):
    global sequence
    sequence += 1
    request_id = sequence
    ws.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
    deadline = time.monotonic() + 12
    while time.monotonic() < deadline:
        message = json.loads(ws.recv())
        if message.get("method") == "Runtime.exceptionThrown":
            errors.append(message["params"])
        if message.get("id") == request_id:
            if "error" in message or "exceptionDetails" in message.get("result", {}):
                raise RuntimeError(message)
            return message["result"]
    raise TimeoutError(method)


def evaluate(expression):
    return call("Runtime.evaluate", {"expression": expression, "awaitPromise": True, "returnByValue": True})["result"].get("value")


def ready(expression):
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        try:
            if evaluate(f"Boolean({expression})"):
                return
        except RuntimeError:
            pass
        time.sleep(0.15)
    raise TimeoutError(expression)


def save(name, data):
    path = OUT / name
    path.write_bytes(data)
    os.chown(path, OUT.stat().st_uid, OUT.stat().st_gid)
    path.chmod(0o600)


def state():
    return evaluate("JSON.parse(localStorage.getItem('attendance-pwa.state.v1'))")


call("Runtime.enable")
call("Page.bringToFront")
call("Emulation.setDeviceMetricsOverride", {"width": 393, "height": 873, "deviceScaleFactor": 2, "mobile": True})
ready("document.querySelector('#dayActionsButton') && navigator.serviceWorker.controller")
assert state()["people"] == [], "Refusing to replace existing test-origin data"
dates = evaluate("""(async()=>{
  const m=await import('./src/model.js');const d=await import('./src/dates.js');
  const today=d.toDateKey(), past=d.shiftDateKey(today,-1), s=m.createEmptyState(1);
  const [a,b,c]=m.addPeople(s,['Тест Анна','Тест Борис','Тест Удалённый'],past,2);
  m.setPersonStatus(s,past,a.id,'sick',3);m.setPersonStatus(s,past,b.id,'absent',4);
  m.archivePerson(s,c.id,5);m.initializeDay(s,today,{seedDefaults:true,timestamp:6});
  m.setPersonStatus(s,today,a.id,'present',7);m.setPersonStatus(s,today,b.id,'drunk',8);
  s.revision=1000;localStorage.setItem('attendance-pwa.state.v1',JSON.stringify(s));
  return {today,past};
})()""")
call("Page.reload")
ready("document.querySelector('#peopleCount')?.textContent==='2' && !document.querySelector('#shareButton').disabled")
before = state()
assert evaluate("document.querySelector('#dayActionsButton').hidden")
past = json.dumps(dates["past"])
open_actions = "document.querySelector('#dateStrip [data-date=\"'+" + past + "+'\"]').click();document.querySelector('#dayActionsButton').click();"
evaluate(open_actions)
evaluate("document.getAnimations().forEach(animation=>animation.finish())")
layout = evaluate("""(()=>{const r=document.querySelector('#dayActionsDialog').getBoundingClientRect();return {open:document.querySelector('#dayActionsDialog').open,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}})()""")
assert layout["open"] and layout["left"] >= -1 and layout["right"] <= layout["width"] + 1
assert layout["top"] >= -1 and layout["bottom"] <= layout["height"] + 1
save("test-day-actions-layout.json", (json.dumps(layout, indent=2) + "\n").encode())
evaluate("document.querySelector('#clearDayButton').click()")
cleared = state()
assert cleared["attendance"][dates["past"]] == {}
assert cleared["attendance"][dates["today"]] == before["attendance"][dates["today"]]
assert cleared["people"] == before["people"]
assert evaluate("document.querySelectorAll('#attendanceList [aria-pressed=true]').length") == 0
ready("!document.querySelector('#shareButton').disabled")
png = evaluate("""(async()=>{
  const oldShare=Object.getOwnPropertyDescriptor(navigator,'share');
  const oldCan=Object.getOwnPropertyDescriptor(navigator,'canShare');
  try {
    const p=new Promise(resolve=>Object.defineProperty(navigator,'share',{configurable:true,value:async({files})=>resolve(files)}));
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
    document.querySelector('#shareButton').click();const [file]=await p;
    return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(file)});
  } finally {
    if(oldShare)Object.defineProperty(navigator,'share',oldShare);else delete navigator.share;
    if(oldCan)Object.defineProperty(navigator,'canShare',oldCan);else delete navigator.canShare;
  }
})()""")
save("test-cleared-share.png", base64.b64decode(png.split(",", 1)[1]))
evaluate("document.querySelector('#toastAction').click()")
assert state()["attendance"] == before["attendance"], "Clear undo failed"
assert state()["people"] == before["people"]
evaluate(open_actions + "document.querySelector('#resetDayButton').click()")
reset = state()
assert len(reset["attendance"][dates["past"]]) == 2
assert [reset["attendance"][dates["past"]][p["id"]]["status"] for p in reset["people"] if p["active"]] == ["present", "drunk"]
assert reset["attendance"][dates["today"]] == before["attendance"][dates["today"]]
assert reset["people"] == before["people"]
evaluate("document.querySelector('#toastAction').click()")
assert state()["attendance"] == before["attendance"], "Reset undo failed"
evaluate(open_actions + "document.querySelector('#clearDayButton').click()")
ready("!document.querySelector('#shareButton').disabled")
call("Page.reload")
ready("document.querySelector('#peopleCount')?.textContent==='2' && !document.querySelector('#shareButton').disabled")
assert state()["attendance"][dates["past"]] == {}
evaluate(open_actions)
assert evaluate("document.querySelector('#clearDayButton').disabled")
evaluate("document.querySelector('[data-close-dialog=dayActionsDialog]').click()")
assert not evaluate("document.querySelector('#dayActionsDialog').open")
assert evaluate("(async()=>{const m=await import('./src/model.js');return m.getOverviewPeople(JSON.parse(localStorage.getItem('attendance-pwa.state.v1'))).length})()") == 2
assert not errors, errors
result = {"clear": True, "clearUndo": True, "resetToDefaults": True, "resetUndo": True,
          "reopenStaysEmpty": True, "otherDayAndDefaultsPreserved": True, "cancel": True,
          "removedPeopleStillExcluded": True, "runtimeErrors": 0, "targetId": page["id"]}
save("browser-verification.json", (json.dumps(result, indent=2) + "\n").encode())
print(json.dumps(result), flush=True)
ws.close()
