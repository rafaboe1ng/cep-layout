from flask import Flask, render_template, jsonify, redirect, url_for, request
from sqlalchemy import create_engine, text
import os

app = Flask(__name__)

# Banco de dados
DB_CONN_STRING = os.getenv(
    "DB_CONN_STRING_VM",
    "mysql+pymysql://nikolas:EFD%40puc2023@54.232.255.210/db_puc",
)
engine = create_engine(DB_CONN_STRING)

@app.route('/', methods=['GET', 'POST'])
def dashboard():
    if request.method == 'POST':
        return redirect(url_for('dashboard'))
    return render_template('dashboard_cep.html')


@app.route('/about')
def about():
    return 'About'


@app.route('/get_counts', methods=['GET'])
def get_counts():
    start = request.args.get('start')
    end = request.args.get('end')
    cells = request.args.getlist('cell')
    if not start or not end:
        return jsonify({'success': False, 'message': 'Missing date range'}), 400

    base_query = (
        """
        SELECT COUNT(si.id) AS total_inspections,
               COUNT(sie.error_id) AS total_defects
        FROM sample_inspection si
        LEFT JOIN sample_inspection_error sie ON si.id = sie.sample_inspection_id
        WHERE si.audit = 0 AND DATE(si.ts) BETWEEN :start AND :end
        """
    )
    params = {'start': start, 'end': end}
    if cells:
        placeholders = ",".join(f":cell{i}" for i in range(len(cells)))
        base_query += f" AND si.cell_id IN ({placeholders})"
        for i, cell in enumerate(cells):
            params[f"cell{i}"] = cell

    try:
        with engine.connect() as conn:
            result = conn.execute(text(base_query), params).mappings().first()
        return jsonify(
            {
                'success': True,
                'total_inspections': result["total_inspections"],
                'total_defects': result["total_defects"],
            }
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/get_errors', methods=['GET'])
def get_errors():
    try:
        query = """
            SELECT cod, name
            FROM error
            WHERE delete_user_id IS NULL
            ORDER BY cod
        """
        with engine.connect() as conn:
            result = conn.execute(text(query)).mappings().all()
        errors = [{'id': row['cod'], 'name': row['name']} for row in result]
        return jsonify({'success': True, 'errors': errors})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/get_top_defects', methods=['GET'])
def get_top_defects():
    start = request.args.get('start')
    end = request.args.get('end')
    order = request.args.get('order', 'desc').lower()
    limit = request.args.get('limit', type=int, default=10)
    cells = request.args.getlist('cell')
    ids = request.args.getlist('id')
    if not start or not end:
        return jsonify({'success': False, 'message': 'Missing date range'}), 400

    base_query = (
        """
        SELECT e.cod AS id, e.name AS name, COUNT(*) AS total
        FROM sample_inspection si
        JOIN sample_inspection_error sie ON si.id = sie.sample_inspection_id
        JOIN error e ON sie.error_id = e.id
        WHERE si.audit = 0 AND DATE(si.ts) BETWEEN :start AND :end
        """
    )
    params = {'start': start, 'end': end}
    if cells:
        placeholders = ",".join(f":cell{i}" for i in range(len(cells)))
        base_query += f" AND si.cell_id IN ({placeholders})"
        for i, cell in enumerate(cells):
            params[f"cell{i}"] = cell
    if ids:
        placeholders = ",".join(f":id{i}" for i in range(len(ids)))
        base_query += f" AND e.cod IN ({placeholders})"
        for i, id_ in enumerate(ids):
            params[f"id{i}"] = id_
    base_query += " GROUP BY e.cod, e.name"
    if ids:
        order_placeholders = ",".join(f":id{i}" for i in range(len(ids)))
        base_query += f" ORDER BY FIELD(e.cod, {order_placeholders})"
    else:
        base_query += f" ORDER BY total {'ASC' if order == 'asc' else 'DESC'} LIMIT :limit"
        params['limit'] = limit
    try:
        with engine.connect() as conn:
            result = conn.execute(text(base_query), params).mappings().all()
        defects = [
            {'id': row['id'], 'name': row['name'], 'total': row['total']}
            for row in result
        ]
        return jsonify({'success': True, 'defects': defects})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
