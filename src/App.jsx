import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

function App() {
  const [text, setText] = useState("https://gdgsrm.com");
    return (
    <div>
      <h1>QR Code Generator</h1>
            <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter a URL or text"
      />

            <div>
        {text ? (
          <QRCodeCanvas value={text} size={256} />
        ) : (
          <p>Type something to generate a QR code</p>
        )}
      </div>

          </div>
  );
}

export default App;