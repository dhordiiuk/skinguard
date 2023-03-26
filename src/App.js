import * as tf from "@tensorflow/tfjs";
import styles from './styles/Home.module.css';
import React, {useState, useEffect} from 'react';
import {Button, Card, Input, List, message, Space, Tooltip, Upload} from 'antd';
import {CameraOutlined, UploadOutlined} from '@ant-design/icons';
import Camera from 'react-html5-camera-photo';
import axios from 'axios';
import 'react-html5-camera-photo/build/css/index.css';
import {SKIN_STATE, getFeaturesModel, getSkinStateModel} from './modelsProcessing';
import * as tflite from '@tensorflow/tfjs-tflite';
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl

export default function App() {
    const [isCameraVisible, setIsCameraVisible] = useState(false);
    const [isResultVisible, setIsResultVisible] = useState(false);
    const [testPicture, setTestPicture] = useState(null);
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [inputText, setInputText] = useState("");
    const [featuresModel, setFeaturesModel] = useState(null);
    const [skinStateModel, setSkinStateModel] = useState(null);
    const [ddd, setDDD] = useState(null);
    const webcamRef = React.useRef(null);
    const imgRef = React.useRef(null);
    const [chatMessages, setChatMessages] = useState([{
        message: "Hi. This is SkinSafeGPT. How can I help you?",
        messageType: "ai",
        timestamp: 0,
        sendAt: 0
    }]);
    // setup wasm path for tf backend loading
    tflite.setWasmPath(
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.8/dist/'
    );

    useEffect( () => {
        tf.ready().then(async () => {
            console.log('Before loaded models');
            const featuresModel = await getFeaturesModel();
            setFeaturesModel(featuresModel);
            const skinModel = await getSkinStateModel();
            setSkinStateModel(skinModel);
            console.log('After loaded models');
        });
    }, []);


    async function predictionFunction() {

    }

    const props = {
        name: 'file',
        multiple: false,
        accept: "image/*",
        action: 'https://us-central1-docgpt-e20ee.cloudfunctions.net/entries/internal/dummy',
        headers: {
            authorization: 'authorization-text',
        },
        onChange(info) {
            if (info.file.status !== 'uploading') {
                console.log(info.file, info.fileList);
            }
            if (info.file.status === 'done') {
                message.success(`${info.file.name} file uploaded successfully`);

                const img = URL.createObjectURL(info.file.originFileObj)
                setTestPicture(img);
                console.log('imgRef', imgRef);
                setIsResultVisible(true)

                setTimeout(() => {
                    predictSkinState();
                }, 500);
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} file upload failed.`);
            }
        },
    };

    const predictSkinState = () => {
        const im = document.getElementById("target-image");
        const tensor = tf.browser.fromPixels(im);
        console.log('tensor', tensor);

        const scaledImage = tensor.div(tf.scalar(255.));

        let frameTensor = scaledImage
            .resizeBilinear([224, 224])
            .reshape([1, 224, 224, 3]);

        // get Image Embedding from MobileNet
        const imgFeature = featuresModel.predict(frameTensor).flatten();
        console.log('imgFeature', imgFeature);
        // get skin state predictions
        const skinStateClasses = skinStateModel.predict(imgFeature);
        const skinClassPred = tf.argMax(tf.bincount(skinStateClasses, [], 2)).arraySync();
        const skinStatePrediction = SKIN_STATE[skinClassPred];
        console.log('skinStatePrediction', skinStatePrediction);
    }

    const handleTakePhoto = (dataUri) => {
        // Do stuff with the photo...
        console.log('takePhoto');

        setTestPicture(dataUri);
        setTimeout(() => {
            setIsCameraVisible(false)
            setIsResultVisible(true)

            setTimeout(() => {
                predictSkinState();
            }, 500);
        }, 1500);
    }

    const handleOpenCamera = () => {
        setIsCameraVisible(true)
    }

    const handleCloseClick = () => {
        setIsResultVisible(false)
    }

    const handleChatOpen = () => {
        setIsChatVisible(true)
    }

    const handleResetClick = () => {
        //reset chat
        setChatMessages([
            {
                message: "Hi. This is SkinSafeGPT. How can I help you?",
                messageType: "ai",
                timestamp: 0,
                sendAt: 0
            }
        ])
    }

    const handleChatCloseClick = () => {
        setIsChatVisible(false)
    }

    const handleInputTextChange = (e) => {
        setInputText(e.target.value);
    }

    useEffect(() => {
        console.log('imgRef.current', imgRef.current);
    }, [setTestPicture]);

    const handleInputTextEnter = () => {
        var d1 = new Date();
        var d2 = new Date(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate(), d1.getUTCHours(), d1.getUTCMinutes(), d1.getUTCSeconds());

        let tempChatMessages = chatMessages
        tempChatMessages.push({
            message: inputText,
            messageType: "human",
            timestamp: d2.getTime(),
            sendAt: new Date()
        })
        setChatMessages(tempChatMessages);

        setInputText("");

        const tempArray = chatMessages;
        tempArray.push({
            message: "...",
            messageType: "ai",
            timestamp: d2.getTime(),
            sendAt: new Date()
        })
        setChatMessages(tempArray);
        
        await axios.post("https://us-central1-docgpt-e20ee.cloudfunctions.net/entries/internal/hello",
          {
            message: "Hello! You are my skin care expert and I have a few questions to ask you regarding skin care and skin cancer. " + inputText
          }).then(result => {
            console.log("result", result)
            d1 = new Date();
            d2 = new Date( d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate(), d1.getUTCHours(), d1.getUTCMinutes(), d1.getUTCSeconds());

            const tempArray = chatMessages;
            tempArray[tempArray.length - 1].message = result.data.message.content
            setChatMessages(tempArray);

            setDDD(Date.now())
          }).catch(error => {
            console.log("error", error)
          });
    }

    if (isChatVisible) {
        return (
            <div className={styles.container}>
                <main>
                    <Card
                        title={"Chat with SkinSafeGPT"}
                        extra={
                            <>
                                <Tooltip placement="bottomRight" title="Reset the chat with your document">
                                    <Button type="link" style={{paddingRight: "0px"}}
                                            onClick={handleResetClick}>Reset</Button>
                                </Tooltip>
                                <Tooltip placement="bottomRight" title="Close the current chat">
                                    <Button type="link" style={{paddingRight: "0px"}}
                                            onClick={handleChatCloseClick}>Close</Button>
                                </Tooltip>
                            </>
                        }
                        bordered={true}
                        style={{
                            maxWidth: "90vw",
                            width: "90vw",
                            margin: 0 + "px auto",
                            borderRadius: "12px",
                            minHeight: "24px",
                            height: "90vh",
                            display: "flex",
                            flexDirection: "column"
                        }}
                        bodyStyle={{
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            boxSizing: "border-box",
                            minHeight: "0px"
                        }}
                    >
                        <List style={{flexGrow: 1, overflow: "auto"}} dataSource={chatMessages}
                              renderItem={(item, index) => (
                                  <>
                                      {index % 2 == 0 &&
                                          <div className="chat-message-row ai"
                                               style={{display: "flex", padding: "12px", justifyContent: "flex-start"}}>
                                              <div className="chat-message" style={{
                                                  whiteSpace: "pre-wrap",
                                                  maxWidth: "500px",
                                                  borderRadius: "8px",
                                                  padding: "6px 12px",
                                                  boxShadow: "0 0 3px #d1d2da",
                                                  backgroundColor: "#f9f9fe"
                                              }}>
                                                  {item.message}
                                              </div>
                                          </div>
                                      }

                                      {index % 2 == 1 &&
                                          <div className="chat-message-row human"
                                               style={{display: "flex", padding: "12px", justifyContent: "flex-end"}}>
                                              <div className="chat-message" style={{
                                                  whiteSpace: "pre-wrap",
                                                  maxWidth: "500px",
                                                  borderRadius: "8px",
                                                  padding: "6px 12px",
                                                  boxShadow: "0 0 3px #d1d2da",
                                                  backgroundColor: "#1777ff",
                                                  color: "#FFFFFF"
                                              }}>
                                                  {item.message}
                                              </div>
                                          </div>
                                      }
                                  </>
                              )}
                        />
                        <Space.Compact
                            style={{
                                width: '100%',
                                marginTop: "12px"
                            }}
                        >
                            <Input defaultValue="" placeholder="Ask any question..." value={inputText}
                                   onChange={handleInputTextChange}/>
                            <Button type="primary" onClick={handleInputTextEnter}>Send</Button>
                        </Space.Compact>
                    </Card>
                </main>
                <style jsx>{`
                  main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  }

                  footer {
                    width: 100%;
                    height: 100px;
                    border-top: 1px solid #eaeaea;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }

                  footer img {
                    margin-left: 0.5rem;
                  }

                  footer a {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-decoration: none;
                    color: inherit;
                  }

                  code {
                    background: #fafafa;
                    border-radius: 5px;
                    padding: 0.75rem;
                    font-size: 1.1rem;
                    font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
                    DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
                  }
                `}</style>

                <style jsx global>{`
                  html,
                  body {
                    padding: 0;
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
                    Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
                    sans-serif;
                  }

                  * {
                    box-sizing: border-box;
                  }
                `}</style>
            </div>
        )
    }

    if (isResultVisible) {
        return (
            <div className={styles.container}>
                <main>
                    <Card
                        title={""}
                        extra={
                            <>
                                {/* <Tooltip placement="bottomRight" title="Reset the chat with your document">
                  <Button type="link" style={{paddingRight: "0px"}} onClick={handleResetClick}>Take another picture</Button>
                </Tooltip> */}
                                <Tooltip placement="bottomRight" title="Close the current chat">
                                    <Button type="link" style={{paddingRight: "0px"}}
                                            onClick={handleCloseClick}>Close</Button>
                                </Tooltip>
                            </>
                        }
                        bordered={true}
                        style={{
                            maxWidth: "80vw",
                            width: "80vw",
                            margin: 0 + "px auto",
                            borderRadius: "12px",
                            minHeight: "24px",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column"
                        }}
                        bodyStyle={{
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            boxSizing: "border-box",
                            minHeight: "0px"
                        }}
                    >
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            textAlign: "center",
                            alignItems: "center"
                        }}>
                            <h3 style={{margin: 0, marginBottom: "5px"}}>
                                Here's your skin test result
                            </h3>
                            <img
                                src={testPicture}
                                id="target-image"
                                style={{
                                    width: "50vw",
                                    maxWidth: 450,
                                    borderRadius: "15px",
                                    border: "3px solid green"
                                }}
                            />
                            <h3>
                                All good! ✅
                            </h3>
                            <p style={{margin: 0}}>
                                This image resembles a benign mole. You probably have nothing to worry about but make
                                sure you get it checked by a dermatologist. Our AI-powered dermatologist is here to
                                answer any questions you might&nbsp;have.
                            </p>
                            <Button type="primary" htmlType="submit" style={{width: "100%", marginTop: "1rem"}}
                                    onClick={handleChatOpen}>
                                Chat with SkinSafeGPT
                            </Button>
                        </div>
                    </Card>
                </main>
                <style jsx>{`
                  main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  }

                  footer {
                    width: 100%;
                    height: 100px;
                    border-top: 1px solid #eaeaea;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }

                  footer img {
                    margin-left: 0.5rem;
                  }

                  footer a {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-decoration: none;
                    color: inherit;
                  }

                  code {
                    background: #fafafa;
                    border-radius: 5px;
                    padding: 0.75rem;
                    font-size: 1.1rem;
                    font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
                    DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
                  }
                `}</style>

                <style jsx global>{`
                  html,
                  body {
                    padding: 0;
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
                    Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
                    sans-serif;
                  }

                  * {
                    box-sizing: border-box;
                  }
                `}</style>
            </div>
        )
    }

    if (isCameraVisible) {
        return (
            <div className={styles.container}>
                <main>
                    <h3 className={styles.title3}>
                        Take a picture of your mole
                    </h3>
                    <Camera
                        ref={webcamRef}
                        onTakePhoto={(dataUri) => {
                            handleTakePhoto(dataUri);
                        }}
                    />
                </main>

                <style jsx>{`
                  main {
                    padding: 2rem 0;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  }

                  footer {
                    width: 100%;
                    height: 100px;
                    border-top: 1px solid #eaeaea;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }

                  footer img {
                    margin-left: 0.5rem;
                  }

                  footer a {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-decoration: none;
                    color: inherit;
                  }

                  code {
                    background: #fafafa;
                    border-radius: 5px;
                    padding: 0.75rem;
                    font-size: 1.1rem;
                    font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
                    DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
                  }
                `}</style>

                <style jsx global>{`
                  html,
                  body {
                    padding: 0;
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
                    Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
                    sans-serif;
                  }

                  * {
                    box-sizing: border-box;
                  }
                `}</style>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <main>
                <p style={{color: "#00A1F1", fontWeight: "bold"}}>
                    When GPT-4 meets Computer Vision
                </p>

                <h1 className={styles.title}>
                    AI Dermatologist: Detect skin cancer early
                </h1>

                {/* <h1 className={styles.title}>
          1 in 5 Americans will develop skin cancer
        </h1> */}

                <p className={styles.description}>
                    1 in 5 Americans will develop skin cancer. Melanoma is the deadliest type of skin cancer, but if you
                    catch it early, you have a 99% chance of survival.
                </p>

                <div className={styles.grid}>
                    <Upload {...props} style={{marginTop: "0px"}}>
                        <Button icon={<UploadOutlined/>}>Upload a picture</Button>
                    </Upload>
                    {"\u00a0\u00a0"}<span style={{marginTop: "0px"}}>or</span>{"\u00a0\u00a0"}
                    <Button icon={<CameraOutlined/>} style={{marginTop: "0px"}} onClick={handleOpenCamera}>Take a
                        picture</Button>
                </div>
            </main>

            <style jsx>{`
              main {
                padding: 5rem 0;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }

              footer {
                width: 100%;
                height: 100px;
                border-top: 1px solid #eaeaea;
                display: flex;
                justify-content: center;
                align-items: center;
              }

              footer img {
                margin-left: 0.5rem;
              }

              footer a {
                display: flex;
                justify-content: center;
                align-items: center;
                text-decoration: none;
                color: inherit;
              }

              code {
                background: #fafafa;
                border-radius: 5px;
                padding: 0.75rem;
                font-size: 1.1rem;
                font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
                DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
              }
            `}</style>

            <style jsx global>{`
              html,
              body {
                padding: 0;
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
                Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
                sans-serif;
              }

              * {
                box-sizing: border-box;
              }
            `}</style>
        </div>
    )
}
