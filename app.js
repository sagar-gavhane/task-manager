const state = {
  servers: [],
  tasks: [],
}

const getRandomId = () =>
  window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16)

// selectors
const getServers = () => state.servers
const getIdleServers = () =>
  state.servers.filter(({ status }) => status === "IDLE")
const getWaitingTasks = () =>
  state.tasks.filter(({ status }) => status === "WAITING")

function addServer() {
  if (state.servers.length < 10) {
    const server = {
      id: getRandomId(),
      name: `Server ${state.servers.length + 1}`,
      status: "IDLE", // should be one of ["IDLE", "PROCESSING"]
      task: null, // initial set task to null
    }

    state.servers.push(server) // update state

    const serverSpanElement = document.createElement("span")
    serverSpanElement.appendChild(document.createTextNode("waiting..."))

    const serverItemElement = document.createElement("li")
    serverItemElement.classList.add("server-item")
    serverItemElement.appendChild(serverSpanElement)
    serverItemElement.dataset.id = server.id

    const serverListElement = document.querySelector(".server-list")
    serverListElement.appendChild(serverItemElement)
  } else {
    throw new Error("Max 10 servers supported.")
  }
}

function removeServer() {
  const idleServers = getIdleServers()

  if (!idleServers.length) return

  const lastServer = idleServers[idleServers.length - 1]
  const nextServers = state.servers.filter(
    (server) => server.id !== lastServer.id
  )
  state.servers = nextServers

  const targetElement = document.querySelector(`[data-id='${lastServer.id}']`)
  if (targetElement) {
    targetElement.remove()
  }

  if (!state.servers.length) {
    const serverListElement = document.querySelector(".server-list")
    serverListElement.innerHTML = "" // remove all childrens
  }
}

function addTasks() {
  const taskInputElement = document.querySelector("#taskInput")
  const numberOfTasks = taskInputElement.valueAsNumber

  if (!Object.is(numberOfTasks, NaN) && numberOfTasks >= 1) {
    const tasks = Array(numberOfTasks)
      .fill()
      .map((_, idx) => {
        return {
          id: getRandomId(),
          name: `Task ${state.tasks.length + idx + 1}`,
          status: "WAITING", // should be one of ["WAITING", "RUNNING"]
          startTime: null,
        }
      })

    state.tasks.push(...tasks) // update state

    // clear task input value
    taskInputElement.value = ""
  }
}

// remove task once it's complete
const taskCleanup = ({ taskIndex, state, serverId }) => {
  state.tasks.splice(taskIndex, 1) // remove task from state

  const serverIndex = state.servers.findIndex(({ id }) => id == serverId)
  if (serverIndex !== -1) {
    state.servers[serverIndex].status = "IDLE"
    state.servers[serverIndex].task = null
  }
}

const taskProcessing = ({ server, state, waitingTasks, idx }) => {
  // mark server as "processing" and add task to it
  server.status = "PROCESSING"
  server.task = waitingTasks[idx]

  // mark task as "running"
  const taskIndex = state.tasks.findIndex(
    ({ id }) => id === waitingTasks[idx].id
  )

  // crosscheck task is exist or not
  if (taskIndex !== -1) {
    state.tasks[taskIndex].status = "RUNNING"
    state.tasks[taskIndex].startTime = Date.now()
  }

  setTimeout(taskCleanup, 20000, { taskIndex, state, serverId: server.id })
}

const performUnitOfWork = () => {
  const idleServers = getIdleServers()
  const waitingTasks = getWaitingTasks()

  // if no waiting task left or waiting is undefined then return (no process further)
  if (typeof waitingTasks === "undefined" || !Array.isArray(waitingTasks)) {
    return
  }

  idleServers.forEach((server, idx) => {
    if (waitingTasks.length > 0 && waitingTasks[idx]?.status === "WAITING") {
      taskProcessing({ server, state, waitingTasks, idx })
    }
  })

  const serverItemElements = document.querySelectorAll(".server-list li")

  state.servers.forEach((server, idx) => {
    const span = serverItemElements[idx].querySelector("span")
    if (server.status === "PROCESSING" && server.task) {
      const millis = `${Math.floor(
        (Date.now() - server.task.startTime) / 1000
      )}`.padStart(2, "0")

      span.classList.add("server-item--running")
      span.textContent = `00:${millis}`
    } else {
      span.classList.remove("server-item--running")
      span.textContent = "waiting..."
    }
  })
}

setInterval(performUnitOfWork, 100)
