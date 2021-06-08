import React, { useContext, useEffect, useState } from 'react'
import socketClient from 'socket.io-client'
import Compressor from 'compressorjs'
import { HicetnuncContext } from '../../context/HicetnuncContext'
import { Page, Container, Padding } from '../../components/layout'
import { Input } from '../../components/input'
import { Button, Curate, Primary } from '../../components/button'
import { Upload } from '../../components/upload'
import { Preview } from '../../components/preview'
import { prepareFile, prepareDirectory } from '../../data/ipfs'
import { prepareFilesFromZIP } from '../../utils/html'
import {
  ALLOWED_MIMETYPES,
  ALLOWED_FILETYPES_LABEL,
  ALLOWED_COVER_MIMETYPES,
  ALLOWED_COVER_FILETYPES_LABEL,
  MINT_FILESIZE,
  MIMETYPE,
  MAX_EDITIONS,
  MIN_ROYALTIES,
  MAX_ROYALTIES,
} from '../../constants'
import { on } from 'local-storage'



///////////////////////////////////////////////////


const coverOptions = {
  quality: 0.85,
  maxWidth: 1024,
  maxHeight: 1024,
}

const thumbnailOptions = {
  quality: 0.85,
  maxWidth: 350,
  maxHeight: 350,
}

// @crzypathwork change to "true" to activate displayUri and thumbnailUri
const GENERATE_DISPLAY_AND_THUMBNAIL = true

export const Mint = () => {
  const { mint, getAuth, acc, setAccount, setFeedback, syncTaquito } =
    useContext(HicetnuncContext)
  // const history = useHistory()
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [amount, setAmount] = useState()
  const [royalties, setRoyalties] = useState()
  const [file, setFile] = useState() // the uploaded file
  const [cover, setCover] = useState() // the uploaded or generated cover image
  const [thumbnail, setThumbnail] = useState() // the uploaded or generated cover image
  const [needsCover, setNeedsCover] = useState(false)


  ////////////////////////////////////////////////////

  const [musicTitle, setMusicTitle] = useState('');
  const [musicCover, setMusicCover] = useState('');
  const [music, setMusic] = useState('');
  const [socketId, setSocket] = useState('');
  

  let sessionId ="000";
  let showEndMenu = false;
  let displayForm = true;
  let displayProcessing = false;
  let showDownloadBtn = false;
  const socket = socketClient("http://127.0.0.1:3002");

  
  //display download btn
  function displayDownload() {
    showDownloadBtn = true;
    displayProcessing = false;
  }

  //useEffect(() => {
    
    socket.onAny((event, ...args) => {
      console.log(args[0]);
      switch (args[0]) {
        case 'Zip_Ready':
          console.log('1');
          displayDownload();
          break;
        case 'Done':
          console.log('2');
          showEndMenu = true;
          break;
        default:
          sessionId = args[0];
          console.log('sessionId '+ sessionId);      
      }
    });
  //}, []);

/*
  socket.onAny((event, ...args) => {
    switch (args[0]) {
      case 'Zip_Ready':
        console.log('1');
        displayDownload();
        break;
      case 'Done':
        console.log('2');
        showEndMenu = true;
        break;
      default:
        console.log('3====');
        sessionId = args[0];
    }
  });
*/
  //download zip
  const DownloadBnt = () => {
    if (!showDownloadBtn) return null;
    console.log("showBtn");
    <button id="downloadBtn" className="submit-btn" onClick={Download}>Download</button>
  }

  const Download = () => {
    showDownloadBtn = false;

    const options = {
      method: 'get',
      headers: {
        'SocketId': sessionId,
        'Content-Type': 'application/zip'
      }
    };

    //useEffect(() => {
      fetch("http://localhost:3002/download", options)
        .then(res => res.blob())
        .then(zip => {
          let file = new File([zip], 'fileName', { type: "application/zip" });
          let exportUrl = URL.createObjectURL(file);

          window.location.assign(exportUrl);
          URL.revokeObjectURL(exportUrl);
        });

   // });
  }


  const handleChange = (event) => {
    const target = event.target;
    const value = target.type === 'file' ? target.files[0] : target.value;
    const name = target.name;
    switch (name){
      case 'musicTitle':
        setMusicTitle(value);
        console.log('title');
        break;
      case 'musicCover':
        setMusicCover(value);
        console.log('cover');
        break;
      case 'music':
        setMusic(value);
        console.log('music');
        break;
    }
    console.log("change");
}

  const handleSubmit = (event) => {
     console.log(">>> >>> "+sessionId);
    event.preventDefault();
    const formData = new FormData();
    formData.append("cover", musicCover, 'cover.jpg');
    formData.append("music", music, 'music.mp3');
    formData.append("socketid", sessionId);

    fetch("http://localhost:3002/upload", {
        method: 'post',
        body: formData,
        headers: {
           'SocketId': sessionId
          }
    })
        .catch((err) => ("Error occured", err));
  }

    //reflesh page for new zip

    function refleshPage() {
      window.location.reload();
    }

  const Processing = () => {
    if (!displayProcessing) return null;
    <div id='processing'>processing</div>
  }

  const AfterZip = () => {
    if (!showEndMenu) return null;
    return (
      < div id='menu' >
        <form action="https://www.hicetnunc.xyz/">
          <input type="submit" value="Go to HEN" />
        </form>
        <button id="zipAgainBtn" className="submit-btn" onClick={refleshPage()}>Zip another</button>
      </div >);

  }

  ///////////////////////////////////

  const handleMint = async () => {
    if (!acc) {
      // warning for sync
      setFeedback({
        visible: true,
        message: 'sync your wallet',
        progress: true,
        confirm: false,
      })

      await syncTaquito()

      setFeedback({
        visible: false,
      })
    } else {
      await setAccount()

      // check mime type
      if (ALLOWED_MIMETYPES.indexOf(file.mimeType) === -1) {
        // alert(
        //   `File format invalid. supported formats include: ${ALLOWED_FILETYPES_LABEL.toLocaleLowerCase()}`
        // )

        setFeedback({
          visible: true,
          message: `File format invalid. supported formats include: ${ALLOWED_FILETYPES_LABEL.toLocaleLowerCase()}`,
          progress: false,
          confirm: true,
          confirmCallback: () => {
            setFeedback({ visible: false })
          },
        })

        return
      }

      // check file size
      const filesize = (file.file.size / 1024 / 1024).toFixed(4)
      if (filesize > MINT_FILESIZE) {
        // alert(
        //   `File too big (${filesize}). Limit is currently set at ${MINT_FILESIZE}MB`
        // )

        setFeedback({
          visible: true,
          message: `File too big (${filesize}). Limit is currently set at ${MINT_FILESIZE}MB`,
          progress: false,
          confirm: true,
          confirmCallback: () => {
            setFeedback({ visible: false })
          },
        })

        return
      }

      // file about to be minted, change to the mint screen

      setStep(2)

      setFeedback({
        visible: true,
        message: 'preparing OBJKT',
        progress: true,
        confirm: false,
      })

      // upload file(s)
      let nftCid
      if (
        [MIMETYPE.ZIP, MIMETYPE.ZIP1, MIMETYPE.ZIP2].includes(file.mimeType)
      ) {
        const files = await prepareFilesFromZIP(file.buffer)

        nftCid = await prepareDirectory({
          name: title,
          description,
          tags,
          address: acc.address,
          files,
          cover,
          thumbnail,
          generateDisplayUri: GENERATE_DISPLAY_AND_THUMBNAIL,
        })
      } else {
        // process all other files
        nftCid = await prepareFile({
          name: title,
          description,
          tags,
          address: acc.address,
          buffer: file.buffer,
          mimeType: file.mimeType,
          cover,
          thumbnail,
          generateDisplayUri: GENERATE_DISPLAY_AND_THUMBNAIL,
        })
      }

      mint(getAuth(), amount, nftCid.path, royalties)
    }
  }

  const handlePreview = () => {
    setStep(1)
  }

  const handleFileUpload = async (props) => {
    setFile(props)

    if (GENERATE_DISPLAY_AND_THUMBNAIL) {
      if (props.mimeType.indexOf('image') === 0) {
        setNeedsCover(false)
        await generateCoverAndThumbnail(props)
      } else {
        setNeedsCover(true)
      }
    }
  }

  const generateCompressedImage = async (props, options) => {
    const blob = await compressImage(props.file, options)
    const mimeType = blob.type
    const buffer = await blob.arrayBuffer()
    const reader = await blobToDataURL(blob)
    return { mimeType, buffer, reader }
  }

  const compressImage = (file, options) => {
    return new Promise(async (resolve, reject) => {
      new Compressor(file, {
        ...options,
        success(blob) {
          resolve(blob)
        },
        error(err) {
          reject(err)
        },
      })
    })
  }

  const blobToDataURL = async (blob) => {
    return new Promise((resolve, reject) => {
      let reader = new FileReader()
      reader.onerror = reject
      reader.onload = (e) => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  }

  const handleCoverUpload = async (props) => {
    await generateCoverAndThumbnail(props)
  }

  const generateCoverAndThumbnail = async (props) => {
    // TMP: skip GIFs to avoid making static
    if (props.mimeType === MIMETYPE.GIF) {
      setCover(props)
      setThumbnail(props)
      return
    }

    const cover = await generateCompressedImage(props, coverOptions)
    setCover(cover)

    const thumb = await generateCompressedImage(props, thumbnailOptions)
    setThumbnail(thumb)
  }

  const limitNumericField = async (target, minValue, maxValue) => {
    if (target.value === '') target.value = '' // Seems redundant but actually cleans up e.g. '234e'
    target.value = Math.round(
      Math.max(Math.min(target.value, maxValue), minValue)
    )
  }

  const handleValidation = () => {
    if (
      amount <= 0 ||
      amount > MAX_EDITIONS ||
      royalties < MIN_ROYALTIES ||
      royalties > MAX_ROYALTIES ||
      !file
    ) {
      return true
    }
    if (GENERATE_DISPLAY_AND_THUMBNAIL) {
      if (cover && thumbnail) {
        return false
      }
    } else {
      return false
    }
    return true
  }



  return (
    <Page title="mint" large>
      {step === 0 && (
        <>
          <Container>
            <Padding>
              <Input
                type="text"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="title"
                label="title"
                value={title}
              />

              <Input
                type="text"
                style={{ whiteSpace: 'pre' }}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="description"
                label="description"
                maxlength="5000"
                value={description}
              />

              <Input
                type="text"
                onChange={(e) => setTags(e.target.value)}
                placeholder="tags (comma separated. example: illustration, digital)"
                label="tags"
                value={tags}
              />

              <Input
                type="number"
                min={1}
                max={MAX_EDITIONS}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={(e) => {
                  limitNumericField(e.target, 1, MAX_EDITIONS)
                  setAmount(e.target.value)
                }}
                placeholder={`editions (no. editions, 1-${MAX_EDITIONS})`}
                label="editions"
                value={amount}
              />

              <Input
                type="number"
                min={MIN_ROYALTIES}
                max={MAX_ROYALTIES}
                onChange={(e) => setRoyalties(e.target.value)}
                onBlur={(e) => {
                  limitNumericField(e.target, MIN_ROYALTIES, MAX_ROYALTIES)
                  setRoyalties(e.target.value)
                }}
                placeholder={`royalties after each sale (between ${MIN_ROYALTIES}-${MAX_ROYALTIES}%)`}
                label="royalties"
                value={royalties}
              />
            </Padding>
          </Container>

          <Container>
            <Padding>
              <Upload
                label="Upload OBJKT"
                allowedTypesLabel={ALLOWED_FILETYPES_LABEL}
                onChange={handleFileUpload}
              />
            </Padding>
          </Container>

          {file && needsCover && (
            <Container>
              <Padding>
                <Upload
                  label="Upload cover image"
                  allowedTypes={ALLOWED_COVER_MIMETYPES}
                  allowedTypesLabel={ALLOWED_COVER_FILETYPES_LABEL}
                  onChange={handleCoverUpload}
                />
              </Padding>
            </Container>
          )}

          <Container>
            <Padding>
              <Button onClick={handlePreview} fit disabled={handleValidation()}>
                <Curate>Preview</Curate>
              </Button>
            </Padding>
          </Container>
        </>
      )}

      {step === 1 && (
        <>
          <Container>
            <Padding>
              <div style={{ display: 'flex' }}>
                <Button onClick={() => setStep(0)} fit>
                  <Primary>
                    <strong>back</strong>
                  </Primary>
                </Button>
              </div>
            </Padding>
          </Container>

          <Container>
            <Padding>
              <Preview
                mimeType={file.mimeType}
                uri={file.reader}
                title={title}
                description={description}
                tags={tags}
              />
            </Padding>
          </Container>

          <Container>
            <Padding>
              <Button onClick={handleMint} fit>
                <Curate>mint OBJKT</Curate>
              </Button>
            </Padding>
          </Container>

          <Container>
            <Padding>
              <p>this operation costs 0.08~ tez</p>
              <p>Your royalties upon each sale are {royalties}%</p>
            </Padding>
          </Container>
        </>
      )}
      <div className="container">
        <h1>Hen.Radio template builderI</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Name2:
            <input name="musicTitle" type="text" onChange={handleChange} />
          </label>
          <label>
            Image:
            <input name="musicCover" type="file" onChange={handleChange} />
          </label>
          <label>
            Music:
            <input name="music" type="file" onChange={handleChange} />
          </label>
          <input type="submit" value="Submit" />
          <p>{sessionId}</p>
      
        </form>
        
        <Processing></Processing>
        <button id="downloadBtn" className="submit-btn" onClick={Download}>Download</button>
        {showEndMenu ? <AfterZip /> : null}
      </div>
    </Page>
  )
}

