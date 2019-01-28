const React = require('react');
const ReactDOM = require('react-dom');
const Bosslog = require('./components/Bosslog');
const $ = require('jquery');
const { decompress } = require('lz-string');
require('./components/register-service-worker');
const localforage = require('localforage');
const Paypal = require('./components/Paypal');
const Login = require('./components/Login');
const TurndownService = require('turndown');
const download = require('in-browser-download');

const { RadioGroup, RadioButton } = require('react-radio-buttons');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
    this.handleToNoteMode = this.handleToNoteMode.bind(this);
    this.handleToSearchMode = this.handleToSearchMode.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleExport = this.handleExport.bind(this);
    this.toSyncStatus = this.toSyncStatus.bind(this);
    this.handlePaymentAmountChange = this.handlePaymentAmountChange.bind(this);
    this.handleNoPayment = this.handleNoPayment.bind(this);
    this.turndownService = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
    this.turndownService.addRule('inputs', {
      filter: 'input',
      replacement: (content, node) => {
        return node.value;
      }
    })
    this.state = {
      searchString: '',
      searchStringValue: '',
      mode: 'note',
      searchResults: [],
      paymentAmount: "12.00"
    };
  }

  componentWillMount() {
    localforage.getItem('bigNotePassword').then(password => {
        $.getJSON('/auth/is-authenticated', result => {
          this.setState({ isAuthenticated: result.isAuthenticated,
                          userEmail: result.userEmail,
                          loggingIn: this.state.loggingIn,
                          passwordIsSet: result.passwordIsSet,
                          photoUrl: result.photoUrl,
                          password });

          if(!result.isAuthenticated && password && !this.state.loggingIn) {
            window.location.href = '/auth/reauthenticate';
          }

          if(result.isAuthenticated) {
            $.getJSON('/auth/pay-prompt', result => {
              this.setState({ promptUser: result.promptUser });
            });
          }
      });
    });
  }

  componentDidMount() {
    window.handleMentionOrHashtagClick = (e) => {
      this.handleToSearchMode();
      this.setState({ searchStringValue: e.target.value, searchString: e.target.value, searching: true });
    }
  }

  handleSearchChange(e) {
    this.setState({ searchStringValue: e.target.value })
  }

  handleSearchSubmit(e) {
    e.preventDefault();
    this.setState({ searchString: this.state.searchStringValue, searching: true });
  }

  handleToNoteMode() {
    this.setState({mode: 'note'});
  }

  handleToSearchMode() {
    this.setState({mode: 'search'}, () => {
      $('.sp-search-box input').focus();
    });
  }

  handleLogout() {
    localforage.dropInstance(); // I've had issues with this not working reliably
    setTimeout(() => window.location.href = '/auth/logout', 300);
  }

  handleExport() {
    download(this.turndownService.turndown(document.querySelector('#sp-note-content')), 'bosslog_export.txt');
  }

  toSyncStatus(syncStatus) {
    $('.sp-bosslog-container').removeClass('green')
      .removeClass('yellow')
      .removeClass('red')
      .addClass(syncStatus);
  }

  handlePaymentAmountChange(value) {
    this.setState({ paymentAmount: value });
  }

  handleNoPayment() {
    $.getJSON('/auth/payment-complete', () => {
      window.alert('Sorry to hear that! Maybe next year :)');
      this.setState({ promptUser: false });
    });
  }

  render() {
    return <div><div className="sp-bosslog-container">
          <div className="sp-note-header">
            <div className={`sp-search-header ${this.state.mode !== 'search' && 'sp-hidden'}`}>
            <a className={`sp-back ${this.state.mode === 'note' && 'sp-hidden'}`}
              onClick={ this.handleToNoteMode }><i className="fa fa-arrow-left fa-2x"></i></a>
            <div className="sp-search field">
              <form autoComplete="off" onSubmit={this.handleSearchSubmit}>
                <input autoComplete="false" name="hidden" type="text" className="sp-hidden" />
                <div className="field has-addons">
                <div className={`sp-search-box control ${this.state.searching && "is-loading"}`}>
                  <input className="input is-medium" type="search"
                    placeholder="Search your note..."
                    value={this.state.searchStringValue}
                    onChange={this.handleSearchChange} /></div>
                  <div className="control">
                    <button type="submit" className="button is-primary is-medium">
                      Search
                    </button>
                  </div></div>
              </form>
            </div>
            </div>
            <a className={`sp-search-icon ${this.state.mode === 'search' && 'sp-hidden'}`}
              onClick={this.handleToSearchMode}>
              <i className="fa fa-search fa-2x"></i>
            </a>
          </div>
          <div className={`sp-note content ${this.state.mode === 'search' && 'sp-with-search-mode'}`}>
          <Bosslog password={this.state.password}
                  isAuthenticated={this.state.isAuthenticated}
                  mode={this.state.mode}
                  searchString={this.state.searchString}
                  toSyncStatus={this.toSyncStatus}
                  searchDone={() => this.setState({ searching: false })}
                  handleToNoteMode={ this.handleToNoteMode }
                  handleWrongPassword = { this.handleWrongPassword }/>
          <div id="sp-note-content" contentEditable="true" autoCapitalize="off" spellCheck="false"></div>
          </div></div>
            <footer className="footer sp-footer">
              <div className="container">
              <div className="content has-text-centered">
              <Login userEmail={this.state.userEmail}
              setPassword={(passwordValue) => this.setState({ password: passwordValue })}
              isAuthenticated={this.state.isAuthenticated}
              password={this.state.password}
              passwordIsSet={this.state.passwordIsSet}
              photoUrl={this.state.photoUrl}/>
              <div className={`modal ${this.state.promptUser && 'is-active'}`}>
                <div className="modal-background" onClick={() => {this.setState({ promptUser: false })}}></div>
                <div className="modal-content">
                  <div className="box is-centered">
                    <h2>Looks like you're enjoying Bosslog. Yay &#127881;</h2>
                    <p><em>Bosslog operates on the honor system. What best describes you?</em></p>
                    <RadioGroup onChange={ this.handlePaymentAmountChange } value={ this.state.paymentAmount }>
                      <RadioButton value="NoPayment" iconSize={20} rootColor="#bebebe" pointColor="#1c2c99">
                        I don't use Bosslog ($0)
                      </RadioButton>
                      <RadioButton value="6.00" iconSize={20} rootColor="#bebebe" pointColor="#1c2c99">
                        I barely use Bosslog ($6)
                      </RadioButton>
                      <RadioButton value="12.00" iconSize={20} rootColor="#bebebe" pointColor="#1c2c99">
                        I use Bosslog ($12)
                      </RadioButton>
                      <RadioButton value="16.00" iconSize={20} rootColor="#bebebe" pointColor="#1c2c99">
                        I rely on Bosslog ($16)
                      </RadioButton>
                      <RadioButton value="24.00" iconSize={20} rootColor="#bebebe" pointColor="#1c2c99">
                        I love Bosslog ($24)
                      </RadioButton>
                      <RadioButton value="36.00" iconSize={20} rootColor="#bebebe" pointColor="#1c2c99">
                        Bosslog changed my life ($36)
                      </RadioButton>
                    </RadioGroup>
                    <p>This payment will cover <strong>a full year</strong> of using Bosslog!</p>
                    {this.state.paymentAmount === 'NoPayment' ?
                        <button className="button is-danger is-large" onClick={this.handleNoPayment}>I don't use Bosslog (no payment).</button>
                        : <Paypal amount={ this.state.paymentAmount } closePrompt={() => {this.setState({ promptUser: false })}}/>}
                  </div></div>
                <button className="modal-close is-large" onClick={() => {this.setState({ promptUser: false })}}></button>
              </div>

              <div className={`modal ${this.state.gettingHelp && 'is-active'}`}>
                <div className="modal-background" onClick={() => this.setState({ gettingHelp: false })}></div>
                <div className="modal-content">
                  <div className="box sp-help">
                  <div className="content">
                    <h1>Cheat sheet</h1>
                    <hr />
                    <div className="columns">
                    <div className="column">
                      <div><strong>Header</strong></div>
                      <div><code># single hash</code></div>
                      <br />
                      <div><strong>Subhead</strong></div>
                      <div><code>## double hash</code></div>
                      <br />
                      <div><strong>List</strong></div>
                      <div><code>- dash</code></div>
                      <br />
                      <div><strong>Checkbox</strong></div>
                      <div><code>[ ] brackets</code></div>
                      <br />
                    </div>
                    <div className="column">
                      <div><strong>Bold</strong></div>
                      <div><code>**asterisks**</code></div>
                      <br />
                      <div><strong>Italic</strong></div>
                      <div><code>_underscores_</code></div>
                      <br />
                      <div><strong>Code Block</strong></div>
                      <div><code>`grave accents`</code></div>
                      <br />
                      <div><strong>Bookmark</strong></div>
                      <div><code>// double slash</code></div>
                      <br />
                    </div>
                    </div>
                    <div><strong>Also...</strong></div>
                    <div>Checkboxes show up in searches for #todo,
                    bookmarks show up in the search page when the search box is empty.
                    @mentions and #hashtags autocomplete.</div>
                    <br />
                  </div>
                </div></div>
                <button className="modal-close is-large" onClick={() => this.setState({ gettingHelp: false })}></button>
              </div>
              <p>Copyright © 2018. Made with ♥ by <a href="https://www.twitter.com/anthonygarvan">@anthonygarvan</a>. Design by Ryan Thurlwell.</p>
              <p><a href="/privacy.txt" target="_blank">Privacy</a> | <a href="/terms.txt" target="_blank">Terms</a> | <a href="https://github.com/anthonygarvan/bosslog" target="_blank">Source</a> | <a onClick={() => this.setState({ promptUser: true })}>Pricing</a> | <a onClick={() => this.setState({ gettingHelp: true })}>Cheat sheet</a> | <a onClick={() => this.handleExport()}>Export</a>{ this.state.isAuthenticated &&   <span> | <a onClick={this.handleLogout}>Logout</a></span> }</p>
              <p>Questions, comments or problems? Feel free to tweet me or file an issue on <a href="https://github.com/anthonygarvan/bosslog/issues">github</a>.</p>
              <div className="sp-logo">
                <img src="/img/logo.png" alt="logo" />
                <div>Bosslog</div>
              </div>
              </div></div></footer></div>
  }
}


ReactDOM.render(
    <App />,
  document.getElementById('root')
);
