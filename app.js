const Nanocomponent = require('nanocomponent')
const choo = require('choo')
const html = require('choo/html')
const css = require("sheetify");
css('./app.css')

class TodoApp extends Nanocomponent {
  constructor () {
    super();
    this.init();
  }
  init () {
    console.log("todoApp:init");
    this.textbox = "";
  }
  click (e) {
    this.state.list.push({text:this.textbox, completed:false});
    this.init();
    this.emit("add_todo")
  }
  onchange (e) {
    this.textbox = e.target.value;
  }

  update (state) {
    console.log("todoApp:update!");
    return true;
  }

  createElement (state, emit) {
    console.log("TodoApp:render")
    this.state = state;
    this.emit = emit;
    return html`
    <div class="todo-app">
      <h1>Todo List</h1>
      <input type="text" onchange=${this.onchange.bind(this)} value="${this.textbox}" />
      <input type="button" value="Add Todo" onclick=${this.click.bind(this)} />
    </div>
    `;
  }
}
class ViewList extends Nanocomponent {
  constructor () {
    super();
  }
  toggle (idx) {
    console.log("viewList:toggle:", idx)
    this.state.list[idx].completed = !this.state.list[idx].completed;
    this.rerender();
  }
  createElement (state) {
    this.state = state;
    console.log("viewList:render", state)
    const list = state.list;
    return html`<div><h4>ViewList</h4>
    <ul class="todo-list">
    ${list
      .filter((item) => {

        switch (state.filter) {
          case 'all' :
            return true
          break;
          case 'completed' :
            return item.completed
          break;
          case 'incomplete' :
            return !item.completed
          break;
          default:
            return true;
          break;
        }
      })
      .map((item,idx) =>
        html`<li onclick=${() => this.toggle(idx) } class="todo-item"><span class="todo-item__text${item.completed ? '--completed' : ''}">${item.text}</span></li>`)}
    </ul>
    </div>`
  }
  update () {
    console.log("viewList:update");
    return true;
  }
}


class Selector extends Nanocomponent {
  constructor () {
    super();
  }

  filter (type) {
    this.emit('changeFilter', type)
    this.rerender();
  }

  createElement (state, emit) {
    this.emit = emit;
    return html`
      <div class="visibility-filters">
      <span onclick=${() => this.filter("all")} class="filter filter${state.filter === 'all' ? '--active' : ''}">all</span>
      <span onclick=${() => this.filter("completed")} class="filter filter${state.filter === 'completed' ? '--active' : ''}">completed</span>
      <span onclick=${() => this.filter("incomplete")} class="filter filter${state.filter === 'incomplete' ? '--active' : ''}">incomplete</span>
      </div>
    `
  }
  update () {
    return true;
  }
}


var app = choo()
var todoApp = new TodoApp;
var viewList = new ViewList;
var selector = new Selector;

function mainView (state, emit) {
  return html`<body>
  ${todoApp.render(state, emit)}
  ${viewList.render(state, emit)}
  ${selector.render(state, emit)}
  </body>`
}
app.use((state, emitter) => {
  state.list = [];
  emitter.on("add_todo", () => {
    emitter.emit("render")
  })
})
app.use((state, emitter) => {
  state.filter = "all" // "completed", "incomplete"
  emitter.on("changeFilter", (type) => {
    state.filter = type;
    viewList.rerender();

  })
})

app.route('/', mainView)
app.mount('body')
