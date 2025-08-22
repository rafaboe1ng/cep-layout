from flask import Flask, render_template

app = Flask(__name__)

from flask import redirect, url_for, request

@app.route('/', methods=['GET', 'POST'])
def dashboard():
    if request.method == 'POST':
        return redirect(url_for('dashboard'))
    return render_template('dashboard_cep.html')


@app.route('/about')
def about():
    return 'About'

if __name__ == '__main__':
    app.run(debug=True)
